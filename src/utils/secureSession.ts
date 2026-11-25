/**
 * Ephemeral Session Storage Utility for EduLedger
 * Strictly uses browser `sessionStorage` (automatically cleared when tab/browser closes).
 * No persistent credentials or tokens in `localStorage`.
 * No automatic login across browser launches.
 */

const SESSION_STORAGE_KEY = 'eduledger_ephemeral_session_v2';
const SESSION_ACTIVITY_KEY = 'eduledger_ephemeral_last_activity_ts';

export interface StoredSessionPayload {
  userId: string;
  username: string;
  role: string;
  issuedAt: number;
  lastActiveAt: number;
  signature: string;
}

// Device salt for session signature
const DEVICE_SALT = 'EduLedger_School_Secure_Session_Salt_2026';

/**
 * Computes a secure SHA-256 integrity signature for the ephemeral session
 */
export async function computeSessionSignature(
  userId: string,
  username: string,
  role: string,
  issuedAt: number
): Promise<string> {
  const content = `${userId}|${username.toLowerCase()}|${role}|${issuedAt}|${DEVICE_SALT}`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(content));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'sig_' + Math.abs(hash).toString(16);
}

/**
 * Saves authenticated user session strictly to sessionStorage.
 * Cleans up any legacy localStorage session tokens to prevent auto-login leaks.
 */
export async function saveSecureSession(
  user: { id: string; username: string; role: string }
): Promise<boolean> {
  if (typeof window === 'undefined' || !window.sessionStorage) return false;

  try {
    const now = Date.now();
    const signature = await computeSessionSignature(user.id, user.username, user.role, now);

    const payload: StoredSessionPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      issuedAt: now,
      lastActiveAt: now,
      signature,
    };

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    window.sessionStorage.setItem(SESSION_ACTIVITY_KEY, now.toString());

    // Clean up any legacy localStorage tokens from previous versions
    try {
      window.localStorage.removeItem('eduledger_secure_session_v1');
      window.localStorage.removeItem('eduledger_current_session_id');
      window.localStorage.removeItem('eduledger_current_user_name');
      window.localStorage.removeItem('eduledger_current_user_role');
      window.localStorage.removeItem('eduledger_remembered_username');
      window.localStorage.removeItem('eduledger_remember_me');
    } catch {
      // Ignore
    }

    return true;
  } catch (err) {
    console.error('Failed to save session to sessionStorage:', err);
    return false;
  }
}

/**
 * Retrieves the current session from sessionStorage with signature verification.
 * Returns null if no session exists or signature verification fails.
 */
export async function getSecureSession(): Promise<StoredSessionPayload | null> {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const payload: StoredSessionPayload = JSON.parse(raw);
    if (!payload || !payload.userId || !payload.signature || !payload.issuedAt) {
      clearSecureSession();
      return null;
    }

    // Verify cryptographic integrity signature
    const expectedSig = await computeSessionSignature(
      payload.userId,
      payload.username,
      payload.role,
      payload.issuedAt
    );

    if (expectedSig !== payload.signature) {
      console.warn('Tampered session token detected. Discarding session.');
      clearSecureSession();
      return null;
    }

    return payload;
  } catch (err) {
    console.warn('Error parsing ephemeral session:', err);
    clearSecureSession();
    return null;
  }
}

/**
 * Updates the user's active timestamp in sessionStorage
 */
export function touchSessionActivity(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(SESSION_ACTIVITY_KEY, Date.now().toString());
  } catch {
    // Ignore
  }
}

/**
 * Retrieves the last recorded active timestamp in milliseconds
 */
export function getLastActivityTimestamp(): number {
  if (typeof window === 'undefined' || !window.sessionStorage) return Date.now();
  try {
    const ts = window.sessionStorage.getItem(SESSION_ACTIVITY_KEY);
    return ts ? parseInt(ts, 10) || Date.now() : Date.now();
  } catch {
    return Date.now();
  }
}

/**
 * Completely terminates the current session and purges sessionStorage
 */
export function clearSecureSession(): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.sessionStorage) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_ACTIVITY_KEY);
    }
    // Also purge any stray localStorage tokens
    if (window.localStorage) {
      window.localStorage.removeItem('eduledger_secure_session_v1');
      window.localStorage.removeItem('eduledger_current_session_id');
      window.localStorage.removeItem('eduledger_current_user_name');
      window.localStorage.removeItem('eduledger_current_user_role');
      window.localStorage.removeItem('eduledger_remembered_username');
      window.localStorage.removeItem('eduledger_remember_me');
    }
  } catch {
    // Ignore
  }
}
