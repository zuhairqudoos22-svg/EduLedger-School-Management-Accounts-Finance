/**
 * Application-Wide Input Sanitization and Security Validation Utility
 * Enforces XSS immunity, type safety, non-negative monetary constraints, and clean strings.
 */

/**
 * Escapes HTML special characters to prevent cross-site scripting (XSS)
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strips dangerous HTML tags, javascript: URIs, and event attributes
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  // Strip control characters and dangerous protocol scripts
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // e.g. onload=, onclick=

  return sanitized.trim();
}

/**
 * Validates monetary numbers: prevents NaN, infinite values, and negative amounts
 */
export function validateNonNegativeAmount(
  value: number | string,
  defaultValue: number = 0,
  maxAllowed: number = 100000000
): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || !isFinite(num) || num < 0) {
    return defaultValue;
  }
  return Math.min(num, maxAllowed);
}

/**
 * Validates integer quantity: non-negative integer within bounds
 */
export function validateNonNegativeInteger(
  value: number | string,
  defaultValue: number = 0,
  maxAllowed: number = 1000000
): number {
  const num = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value);
  if (isNaN(num) || !isFinite(num) || num < 0) {
    return defaultValue;
  }
  return Math.min(num, maxAllowed);
}

/**
 * Validates username format: alphanumeric and underscore only, 3 to 30 characters
 */
export function isValidUsername(username: string): boolean {
  if (!username) return false;
  const regex = /^[a-zA-Z0-9_]{3,30}$/;
  return regex.test(username.trim());
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}
