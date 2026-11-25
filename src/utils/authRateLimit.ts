/**
 * Persistent localStorage-backed Rate Limiting Utility
 * Enforces cooldowns and hourly/window quotas for:
 * - Resend Verification Emails (60s cooldown + max 5/hour)
 * - Password Reset Requests (60s cooldown + max 5/15 min)
 * - Login Throttle (per-identifier consecutive failure backoff)
 */

const STORAGE_KEYS = {
  resendVerification: 'eduledger_rl_verify_v1',
  passwordReset: 'eduledger_rl_reset_v1',
  loginThrottle: 'eduledger_rl_login_v1',
};

interface QuotaBucket {
  timestamps: number[];
  lastSentAt: number;
}

interface LoginBucket {
  failures: number;
  lockedUntil: number;
  lastAttemptAt: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remainingInWindow: number;
  reason?: string;
}

function readBucketMap<T>(storageKey: string): Record<string, T> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeBucketMap<T>(storageKey: string, map: Record<string, T>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

function normalizeKey(identifier: string): string {
  return identifier.trim().toLowerCase() || '__default__';
}

// ==========================================
// 1. RESEND VERIFICATION EMAIL RATE LIMIT
//    - 60 seconds minimum cooldown between sends
//    - Maximum 5 verification emails per rolling 60 minutes
// ==========================================

const VERIFY_COOLDOWN_MS = 60 * 1000;
const VERIFY_WINDOW_MS = 60 * 60 * 1000;
const VERIFY_MAX_PER_HOUR = 5;

export function checkResendVerificationLimit(identifier: string): RateLimitCheckResult {
  const key = normalizeKey(identifier);
  const now = Date.now();
  const map = readBucketMap<QuotaBucket>(STORAGE_KEYS.resendVerification);
  const bucket = map[key] || { timestamps: [], lastSentAt: 0 };

  const recent = bucket.timestamps.filter(ts => now - ts < VERIFY_WINDOW_MS);
  const elapsedSinceLast = now - bucket.lastSentAt;

  if (bucket.lastSentAt > 0 && elapsedSinceLast < VERIFY_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((VERIFY_COOLDOWN_MS - elapsedSinceLast) / 1000);
    return {
      allowed: false,
      retryAfterSeconds,
      remainingInWindow: Math.max(0, VERIFY_MAX_PER_HOUR - recent.length),
      reason: `Please wait ${retryAfterSeconds}s before requesting another verification email.`,
    };
  }

  if (recent.length >= VERIFY_MAX_PER_HOUR) {
    const oldest = Math.min(...recent);
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + VERIFY_WINDOW_MS - now) / 1000));
    const mins = Math.ceil(retryAfterSeconds / 60);
    return {
      allowed: false,
      retryAfterSeconds,
      remainingInWindow: 0,
      reason: `Hourly verification email limit reached (5/hour). Try again in ~${mins} minute(s).`,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingInWindow: VERIFY_MAX_PER_HOUR - recent.length,
  };
}

export function recordResendVerification(identifier: string): RateLimitCheckResult {
  const key = normalizeKey(identifier);
  const now = Date.now();
  const map = readBucketMap<QuotaBucket>(STORAGE_KEYS.resendVerification);
  const existing = map[key] || { timestamps: [], lastSentAt: 0 };
  const recent = existing.timestamps.filter(ts => now - ts < VERIFY_WINDOW_MS);
  recent.push(now);

  map[key] = {
    timestamps: recent,
    lastSentAt: now,
  };
  writeBucketMap(STORAGE_KEYS.resendVerification, map);

  return {
    allowed: true,
    retryAfterSeconds: 60,
    remainingInWindow: Math.max(0, VERIFY_MAX_PER_HOUR - recent.length),
  };
}

// ==========================================
// 2. PASSWORD RESET REQUEST RATE LIMIT
//    - 60 seconds minimum cooldown between requests
//    - Maximum 5 requests per 15-minute rolling window
// ==========================================

const RESET_COOLDOWN_MS = 60 * 1000;
const RESET_WINDOW_MS = 15 * 60 * 1000;
const RESET_MAX_PER_WINDOW = 5;

export function checkPasswordResetLimit(identifier: string): RateLimitCheckResult {
  const key = normalizeKey(identifier);
  const now = Date.now();
  const map = readBucketMap<QuotaBucket>(STORAGE_KEYS.passwordReset);
  const bucket = map[key] || { timestamps: [], lastSentAt: 0 };

  const recent = bucket.timestamps.filter(ts => now - ts < RESET_WINDOW_MS);
  const elapsedSinceLast = now - bucket.lastSentAt;

  if (bucket.lastSentAt > 0 && elapsedSinceLast < RESET_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((RESET_COOLDOWN_MS - elapsedSinceLast) / 1000);
    return {
      allowed: false,
      retryAfterSeconds,
      remainingInWindow: Math.max(0, RESET_MAX_PER_WINDOW - recent.length),
      reason: `Please wait ${retryAfterSeconds}s before requesting another password reset email.`,
    };
  }

  if (recent.length >= RESET_MAX_PER_WINDOW) {
    const oldest = Math.min(...recent);
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + RESET_WINDOW_MS - now) / 1000));
    const mins = Math.ceil(retryAfterSeconds / 60);
    return {
      allowed: false,
      retryAfterSeconds,
      remainingInWindow: 0,
      reason: `Too many password reset attempts (5 per 15 minutes). Please try again in ~${mins} minute(s).`,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingInWindow: RESET_MAX_PER_WINDOW - recent.length,
  };
}

export function recordPasswordReset(identifier: string): RateLimitCheckResult {
  const key = normalizeKey(identifier);
  const now = Date.now();
  const map = readBucketMap<QuotaBucket>(STORAGE_KEYS.passwordReset);
  const existing = map[key] || { timestamps: [], lastSentAt: 0 };
  const recent = existing.timestamps.filter(ts => now - ts < RESET_WINDOW_MS);
  recent.push(now);

  map[key] = {
    timestamps: recent,
    lastSentAt: now,
  };
  writeBucketMap(STORAGE_KEYS.passwordReset, map);

  return {
    allowed: true,
    retryAfterSeconds: 60,
    remainingInWindow: Math.max(0, RESET_MAX_PER_WINDOW - recent.length),
  };
}

// ==========================================
// 3. LOGIN ATTEMPT THROTTLE (SUPPLEMENTARY TO IDB)
//    - Blocks excessive rapid attempts per username/email
// ==========================================

export function checkLoginThrottle(identifier: string): {
  blocked: boolean;
  retryAfterSeconds: number;
  message?: string;
} {
  const key = normalizeKey(identifier);
  const now = Date.now();
  const map = readBucketMap<LoginBucket>(STORAGE_KEYS.loginThrottle);
  const bucket = map[key];

  if (!bucket) return { blocked: false, retryAfterSeconds: 0 };
  if (bucket.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((bucket.lockedUntil - now) / 1000);
    return {
      blocked: true,
      retryAfterSeconds,
      message: `Too many failed sign-in attempts. Please wait ${Math.ceil(retryAfterSeconds / 60)} minute(s) before trying again.`,
    };
  }
  return { blocked: false, retryAfterSeconds: 0 };
}

export function recordLoginAttempt(identifier: string, success: boolean): void {
  const key = normalizeKey(identifier);
  const now = Date.now();
  const map = readBucketMap<LoginBucket>(STORAGE_KEYS.loginThrottle);

  if (success) {
    delete map[key];
    writeBucketMap(STORAGE_KEYS.loginThrottle, map);
    return;
  }

  const prev = map[key] || { failures: 0, lockedUntil: 0, lastAttemptAt: 0 };
  // Reset streak if last attempt was more than 30 mins ago
  const stale = prev.lastAttemptAt > 0 && now - prev.lastAttemptAt > 30 * 60 * 1000;
  const failures = (stale ? 0 : prev.failures) + 1;

  let lockedUntil = 0;
  if (failures >= 5) {
    // 5 mins base, escalating up to 30 mins
    const exponent = Math.min(3, Math.floor((failures - 5) / 5));
    lockedUntil = now + 5 * 60 * 1000 * Math.pow(2, exponent);
  }

  map[key] = {
    failures,
    lockedUntil,
    lastAttemptAt: now,
  };
  writeBucketMap(STORAGE_KEYS.loginThrottle, map);
}
