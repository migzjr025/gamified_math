import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Generates a cryptographically secure salted hash using Node.js scrypt.
 * Format: scrypt$<salt_hex>$<derived_key_hex>
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

/**
 * Constant-time string equality check to mitigate timing attacks.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verifies a password against a stored hash or legacy credentials.
 * Supports:
 *  1. Modern salted scrypt: `scrypt$<salt>$<hash>`
 *  2. Legacy SHA-256 (64 hex characters)
 *  3. Plaintext fallback (legacy initial seed before first login)
 */
export function verifyPassword(password: string, storedPassword?: string | null): boolean {
  if (!storedPassword || typeof storedPassword !== "string") {
    return false;
  }

  // 1. Modern salted scrypt hash
  if (storedPassword.startsWith("scrypt$")) {
    const parts = storedPassword.split("$");
    if (parts.length === 3) {
      const [, salt, expectedHash] = parts;
      try {
        const derived = scryptSync(password, salt, 64).toString("hex");
        return safeEqual(derived, expectedHash);
      } catch {
        return false;
      }
    }
    return false;
  }

  // 2. Legacy SHA-256 hash (64 hex characters)
  if (storedPassword.length === 64 && /^[0-9a-fA-F]+$/.test(storedPassword)) {
    const legacyHash = createHash("sha256").update(password).digest("hex");
    if (safeEqual(legacyHash.toLowerCase(), storedPassword.toLowerCase())) {
      return true;
    }
  }

  // 3. Plaintext fallback (legacy fallback support)
  return safeEqual(password, storedPassword);
}

/**
 * Checks whether an existing stored hash should be upgraded to the salted scrypt algorithm.
 */
export function needsRehash(storedPassword?: string | null): boolean {
  if (!storedPassword) return true;
  return !storedPassword.startsWith("scrypt$");
}
