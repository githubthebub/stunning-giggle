/**
 * Field-level encryption for data at rest.
 *
 * Sensitive free-text (journal entries, thought records, reflections, notes) is
 * encrypted with AES before it is written to SQLite, using the device master key
 * (see keys.ts). Each encryption uses a fresh random salt + IV, so identical
 * plaintext produces different ciphertext.
 *
 * NOTE ON STRENGTH / UPGRADE PATH: this is app-layer field encryption, chosen so
 * the app runs in Expo Go for fast iteration. For production you can upgrade to
 * whole-database encryption (SQLCipher) via a config plugin + dev build; the
 * repository layer is written against this small interface so swapping it is a
 * localised change. See app/README.md ("Encryption & the SQLCipher upgrade").
 */
import CryptoJS from 'crypto-js';
import { getOrCreateMasterKey } from './keys';

const CIPHER_PREFIX = 'enc.v1:';

let cachedKey: string | null = null;

/** Load the master key into memory. Call once at startup (see storage/db.ts). */
export async function initCrypto(): Promise<void> {
  cachedKey = await getOrCreateMasterKey();
}

/** For tests / teardown. */
export function _resetCryptoForTests(key: string | null): void {
  cachedKey = key;
}

function requireKey(): string {
  if (!cachedKey) {
    throw new Error('Crypto not initialised — call initCrypto() before storage access.');
  }
  return cachedKey;
}

/** Encrypt a string. Returns a tagged ciphertext string safe to store as TEXT. */
export function encryptString(plaintext: string): string {
  if (plaintext === '') return '';
  const cipher = CryptoJS.AES.encrypt(plaintext, requireKey()).toString();
  return CIPHER_PREFIX + cipher;
}

/**
 * Decrypt a value produced by encryptString. Values without the tag prefix are
 * returned unchanged (tolerates pre-existing/plaintext values and empty fields).
 * On any failure returns an empty string rather than throwing.
 */
export function decryptString(value: string | null | undefined): string {
  if (!value) return '';
  if (!value.startsWith(CIPHER_PREFIX)) return value;
  try {
    const cipher = value.slice(CIPHER_PREFIX.length);
    const bytes = CryptoJS.AES.decrypt(cipher, requireKey());
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
}
