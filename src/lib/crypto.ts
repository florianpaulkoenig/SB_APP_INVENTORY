// ---------------------------------------------------------------------------
// Secure password hashing using Web Crypto API (PBKDF2)
// ---------------------------------------------------------------------------

const ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;

/**
 * Hash a password using PBKDF2 with a random salt.
 * Returns a string in format: `salt_hex:hash_hex`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH,
  );
  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt, (b) => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a stored hash.
 * Constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  // Reject legacy non-PBKDF2 hashes — force password re-set
  if (parts.length !== 2) {
    return false;
  }
  const [saltHex, expectedHashHex] = parts;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH,
  );
  const actualHashHex = Array.from(new Uint8Array(derivedBits), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  // Constant-time comparison
  if (actualHashHex.length !== expectedHashHex.length) return false;
  let result = 0;
  for (let i = 0; i < actualHashHex.length; i++) {
    result |= actualHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return result === 0;
}
