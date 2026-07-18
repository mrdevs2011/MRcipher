import type {
  DecryptApiResponse,
  EncryptApiResponse,
  EncryptedPayload,
  MRCipherOptions,
  MRCipherResult,
} from './types';

/**
 * Server-side MRcipher SDK for Node.js / Next.js / Express.
 *
 * Keeps plaintext off your database: encrypt before saving, decrypt only
 * when you need the raw value (e.g. comparing an OTP or showing a phone).
 */
export class MRCipherServer {
  private readonly serverUrl: string;
  private readonly apiKey: string;

  constructor(options: Pick<MRCipherOptions, 'serverUrl' | 'apiKey'>) {
    this.serverUrl = options.serverUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.serverUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as T | { success: false; error: { message: string } };
    if (!res.ok || (json as any).success === false) {
      const message = (json as any).error?.message ?? `MRcipher request failed: ${res.status}`;
      throw new Error(message);
    }
    return json as T;
  }

  async encrypt(value: unknown): Promise<MRCipherResult<EncryptedPayload>> {
    const res = await this.post<EncryptApiResponse>('/api/v1/encrypt', { content: value });
    return { data: res.data, meta: res.meta };
  }

  async decrypt<T = unknown>(payload: EncryptedPayload): Promise<MRCipherResult<T>> {
    const res = await this.post<DecryptApiResponse>('/api/v1/decrypt', { content: payload });
    return { data: res.data as T, meta: res.meta };
  }
}

/**
 * Next.js Route Handler middleware: encrypt configured fields of the request
 * body before it reaches your handler.
 *
 * Usage in a route handler:
 *
 *   import { withEncryptedBody } from '@/lib/mrcipher-sdk/server';
 *
 *   const POST = withEncryptedBody(
 *     { serverUrl, apiKey, encryptFields: ['phone', 'otp'] },
 *     async (req) => {
 *       const body = await req.json(); // phone and otp are already encrypted
 *       await db.saveOtpRequest(body);
 *       return NextResponse.json({ ok: true });
 *     }
 *   );
 */
export function withEncryptedBody(
  options: Pick<MRCipherOptions, 'serverUrl' | 'apiKey' | 'encryptFields'>,
  handler: (req: Request) => Promise<Response> | Response,
): (req: Request) => Promise<Response> {
  const fields = new Set(options.encryptFields ?? []);
  const cipher = new MRCipherServer(options);

  const walk = async (obj: unknown): Promise<unknown> => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return Promise.all(obj.map((item) => walk(item)));

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (fields.has(key) && value !== undefined) {
        const enc = await cipher.encrypt(value);
        out[key] = enc.data;
      } else {
        out[key] = await walk(value);
      }
    }
    return out;
  };

  return async (req) => {
    let body = await req.json().catch(() => ({}));
    body = await walk(body);

    const modified = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(body),
    });

    return handler(modified);
  };
}

/**
 * Next.js Route Handler middleware: decrypt configured fields of a JSON
 * response produced by your handler before it leaves the server.
 */
export function withDecryptedResponse(
  options: Pick<MRCipherOptions, 'serverUrl' | 'apiKey' | 'decryptFields'>,
  handler: (req: Request) => Promise<Response> | Response,
): (req: Request) => Promise<Response> {
  const fields = new Set(options.decryptFields ?? []);
  const cipher = new MRCipherServer(options);

  const walk = async (obj: unknown): Promise<unknown> => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return Promise.all(obj.map((item) => walk(item)));

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const isPayload =
        typeof value === 'object' &&
        value !== null &&
        'ciphertext' in value &&
        'iv' in value &&
        'tag' in value &&
        'version' in value;

      if (fields.has(key) && isPayload) {
        const dec = await cipher.decrypt(value as EncryptedPayload);
        out[key] = dec.data;
      } else {
        out[key] = await walk(value);
      }
    }
    return out;
  };

  return async (req) => {
    const response = await handler(req);
    const text = await response.clone().text();

    let decryptedText = text;
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        const decrypted = await walk(parsed);
        decryptedText = JSON.stringify(decrypted);
      } catch {
        // Leave response unchanged if it cannot be decrypted.
      }
    }

    return new Response(decryptedText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}
