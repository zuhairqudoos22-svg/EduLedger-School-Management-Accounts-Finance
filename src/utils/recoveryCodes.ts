/**
 * Offline & Backup Recovery Codes Utility (10 One-Time Emergency Codes)
 * Formatted as: XXXX-XXXX (e.g. 4F9B-2E7A)
 * Stored securely hashed with salt. Each code works exactly once.
 */

import { legacySha256, constantTimeCompare } from './crypto';

export interface HashedRecoveryCode {
  codeHash: string;
  used: boolean;
  usedAt?: string;
}

/**
 * Generates 10 cryptographically random, human-friendly backup recovery codes
 */
export function generateBackupRecoveryCodes(count = 10): string[] {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous characters (0, O, 1, I)
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const buffer = new Uint8Array(8);
    crypto.getRandomValues(buffer);
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[buffer[j] % chars.length];
      if (j === 3) code += '-';
    }
    codes.push(code);
  }

  return codes;
}

/**
 * Generates a random cryptographic salt for the recovery codes set
 */
export function generateRecoveryCodesSalt(): string {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hashes an array of plain recovery codes with a specific salt
 */
export async function hashBackupRecoveryCodes(
  codes: string[],
  salt: string
): Promise<HashedRecoveryCode[]> {
  const hashed: HashedRecoveryCode[] = [];
  for (const code of codes) {
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const codeHash = await legacySha256(cleanCode + ':' + salt);
    hashed.push({
      codeHash,
      used: false,
    });
  }
  return hashed;
}

/**
 * Verifies and consumes a one-time recovery code
 * Returns updated code list with the matched code marked as used
 */
export async function verifyAndConsumeRecoveryCode(
  enteredCode: string,
  storedCodes: HashedRecoveryCode[] = [],
  salt: string = ''
): Promise<{ valid: boolean; updatedCodes?: HashedRecoveryCode[]; matchedIndex?: number }> {
  if (!enteredCode || !storedCodes || storedCodes.length === 0) {
    return { valid: false };
  }

  const cleanEntered = enteredCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const enteredHash = await legacySha256(cleanEntered + ':' + salt);

  for (let idx = 0; idx < storedCodes.length; idx++) {
    const item = storedCodes[idx];
    if (!item.used && constantTimeCompare(item.codeHash, enteredHash)) {
      const updatedCodes = storedCodes.map((c, i) =>
        i === idx ? { ...c, used: true, usedAt: new Date().toISOString() } : c
      );
      return {
        valid: true,
        updatedCodes,
        matchedIndex: idx,
      };
    }
  }

  return { valid: false };
}
