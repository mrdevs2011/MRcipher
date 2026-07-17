import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import {
  AES_GCM_IV_LENGTH,
  AES_GCM_TAG_LENGTH,
  AES_KEY_SIZE,
  deriveUserKey,
} from '../config';
import { EncryptedPayload } from '../types';
import { ApiError } from '../utils/errors';

/**
 * AES-256-GCM encryption engine.
 *
 * - A fresh 16-byte IV is generated for every encryption operation.
 * - The 16-byte GCM authentication tag is returned alongside the ciphertext.
 * - A deterministic per-user key is derived from the master key + user id.
 */

/**
 * Encrypt a UTF-8 plaintext string into an EncryptedPayload.
 *
 * @param plaintext - The string to encrypt.
 * @param userId    - Identifies the API-key owner; used to derive the key.
 */
export function encrypt(plaintext: string, userId: string): EncryptedPayload {
  const key = deriveUserKey(userId);

  if (key.length !== AES_KEY_SIZE) {
    throw new ApiError('Invalid encryption key length', 500, 'KEY_ERROR');
  }

  const iv = randomBytes(AES_GCM_IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv, {
    authTagLength: AES_GCM_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    version: 'v1',
  };
}

/**
 * Decrypt an EncryptedPayload back into a UTF-8 string.
 *
 * @param payload - The encrypted container.
 * @param userId  - Must match the user id used during encryption.
 */
export function decrypt(payload: EncryptedPayload, userId: string): string {
  const key = deriveUserKey(userId);

  if (key.length !== AES_KEY_SIZE) {
    throw new ApiError('Invalid encryption key length', 500, 'KEY_ERROR');
  }

  let iv: Buffer;
  let ciphertext: Buffer;
  let tag: Buffer;

  try {
    iv = Buffer.from(payload.iv, 'base64');
    ciphertext = Buffer.from(payload.ciphertext, 'base64');
    tag = Buffer.from(payload.tag, 'base64');
  } catch {
    throw new ApiError('Malformed encrypted payload', 400, 'PAYLOAD_MALFORMED');
  }

  if (iv.length !== AES_GCM_IV_LENGTH) {
    throw new ApiError('Invalid IV length', 400, 'PAYLOAD_MALFORMED');
  }

  if (tag.length !== AES_GCM_TAG_LENGTH) {
    throw new ApiError('Invalid authentication tag length', 400, 'PAYLOAD_MALFORMED');
  }

  const decipher = createDecipheriv('aes-256-gcm', key, iv, {
    authTagLength: AES_GCM_TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    // Never expose whether the ciphertext or tag was wrong.
    throw new ApiError(
      'Decryption failed: invalid key or corrupted payload',
      400,
      'DECRYPTION_FAILED',
    );
  }
}
