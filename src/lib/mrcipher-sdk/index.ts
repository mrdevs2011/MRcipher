export { MRCipherClient, patchGlobalFetch } from './client';
export { MRCipherServer, withEncryptedBody, withDecryptedResponse } from './server';
export { useMRCipher, useEncryptedField } from './react';
export type {
  MRCipherOptions,
  MRCipherResult,
  EncryptedPayload,
  EncryptApiResponse,
  DecryptApiResponse,
  MRCipherError,
} from './types';

/**
 * Drop-in SDK for MRcipher.
 *
 * Install this code into any frontend or backend project, configure the API key
 * and the fields you want to protect, and MRcipher handles the rest.
 *
 * Example (frontend):
 *   import { MRCipherClient } from './mrcipher-sdk';
 *   const cipher = new MRCipherClient({
 *     serverUrl: 'https://mrcipher.vercel.app',
 *     apiKey: 'mr_...',
 *     encryptFields: ['phone', 'otp', 'email', 'card'],
 *     decryptFields: ['phone', 'otp'],
 *   });
 *   await cipher.fetch('https://your-api.com/send-otp', { method: 'POST', body: JSON.stringify({ phone }) });
 *
 * Example (backend):
 *   import { MRCipherServer } from './mrcipher-sdk';
 *   const cipher = new MRCipherServer({ serverUrl, apiKey });
 *   const { data: encOtp } = await cipher.encrypt(otp);
 *   await db.setOtp(userId, encOtp);
 *   const { data: plainOtp } = await cipher.decrypt(encOtp); // only when comparing
 */
