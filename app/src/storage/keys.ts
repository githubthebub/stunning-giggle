/**
 * Master-key management.
 *
 * The encryption key never leaves the device: it is generated once from a
 * cryptographically-secure source and stored in the OS secure enclave
 * (iOS Keychain / Android Keystore) via expo-secure-store. It is never written
 * to the database, logged, or transmitted.
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const MASTER_KEY_ID = 'compass.master-key.v1';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Return the app's master key, creating and persisting a fresh 256-bit key on
 * first launch. Subsequent launches read the same key back from secure storage.
 */
export async function getOrCreateMasterKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(MASTER_KEY_ID);
  if (existing) return existing;

  const random = await Crypto.getRandomBytesAsync(32);
  const key = toHex(random);
  await SecureStore.setItemAsync(MASTER_KEY_ID, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
  return key;
}

/**
 * Destroy the master key. Because every sensitive field is encrypted with it,
 * removing it renders existing encrypted data unreadable — used as part of the
 * "erase all my data" flow in Settings.
 */
export async function destroyMasterKey(): Promise<void> {
  await SecureStore.deleteItemAsync(MASTER_KEY_ID);
}
