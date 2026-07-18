'use client';

import { useCallback, useState } from 'react';
import { MRCipherClient } from './client';
import type { MRCipherOptions } from './types';

/**
 * React hook that exposes the MRcipher client for forms and secure fetch calls.
 *
 * Usage:
 *   const { secureFetch, encrypt, decrypt, isLoading } = useMRCipher({
 *     serverUrl: 'https://mrcipher.vercel.app',
 *     apiKey: 'mr_...',
 *     encryptFields: ['phone', 'otp', 'email'],
 *     decryptFields: ['phone', 'otp'],
 *   });
 *
 *   const onSubmit = async (values) => {
 *     const res = await secureFetch('https://my-server.com/api/send-otp', {
 *       method: 'POST',
 *       body: JSON.stringify(values),
 *     });
 *     const data = await res.json();
 *   };
 */
export function useMRCipher(options: MRCipherOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = new MRCipherClient(options);

  const encrypt = useCallback(
    async (value: unknown) => {
      setIsLoading(true);
      setError(null);
      try {
        return await client.encrypt(value);
      } catch (err: any) {
        setError(err?.message ?? 'Shifrlashda xatolik');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const decrypt = useCallback(
    async (payload: any) => {
      setIsLoading(true);
      setError(null);
      try {
        return await client.decrypt(payload);
      } catch (err: any) {
        setError(err?.message ?? 'Shifrni ochishda xatolik');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const secureFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await client.fetch(url, init ?? {});
        return res;
      } catch (err: any) {
        setError(err?.message ?? 'Xavfsiz so\'rovda xatolik');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const postJson = useCallback(
    async <T = unknown>(url: string, body: unknown): Promise<T> => {
      const res = await secureFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return (await res.json()) as T;
    },
    [secureFetch],
  );

  return {
    encrypt,
    decrypt,
    secureFetch,
    postJson,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Convenience hook for auto-encrypting a single form field.
 *
 * Returns the raw value for the input and the encrypted container for
 * sending to the server.
 */
export function useEncryptedField(options: Pick<MRCipherOptions, 'serverUrl' | 'apiKey'>) {
  const [rawValue, setRawValue] = useState('');
  const [encrypted, setEncrypted] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const client = new MRCipherClient({
    ...options,
    encryptFields: [],
    decryptFields: [],
  });

  const encrypt = useCallback(async () => {
    if (!rawValue) return;
    setIsLoading(true);
    try {
      const res = await client.encrypt(rawValue);
      setEncrypted(res.data);
      return res.data;
    } finally {
      setIsLoading(false);
    }
  }, [client, rawValue]);

  return {
    rawValue,
    setRawValue,
    encrypted,
    encrypt,
    isLoading,
  };
}
