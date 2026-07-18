import type {
  DecryptApiResponse,
  EncryptApiResponse,
  EncryptedPayload,
  MRCipherOptions,
  MRCipherResult,
} from './types';

/**
 * Universal browser/client SDK for MRcipher.
 *
 * Usage:
 *   const cipher = new MRCipherClient({
 *     serverUrl: 'https://mrcipher.vercel.app',
 *     apiKey: 'mr_...',
 *     encryptFields: ['phone', 'otp', 'email'],
 *     decryptFields: ['phone', 'otp'],
 *   });
 *
 *   // Manual encrypt/decrypt
 *   const enc = await cipher.encrypt('+998901234567');
 *   const phone = await cipher.decrypt<string>(enc.data);
 *
 *   // Auto-encrypt fetch wrapper
 *   const res = await cipher.fetch('https://my-server.com/api/send-otp', {
 *     method: 'POST',
 *     body: JSON.stringify({ phone: '+998901234567' }),
 *   });
 */
export class MRCipherClient {
  private readonly serverUrl: string;
  private readonly apiKey: string;
  private readonly encryptFields: Set<string>;
  private readonly decryptFields: Set<string>;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly retryDelayMs: number;

  constructor(options: MRCipherOptions) {
    this.serverUrl = options.serverUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.encryptFields = new Set(options.encryptFields ?? []);
    this.decryptFields = new Set(options.decryptFields ?? []);
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.retries = Math.max(0, options.retries ?? 2);
    this.retryDelayMs = Math.max(0, options.retryDelayMs ?? 500);
  }

  private headers(): Record<string, string> {
    return {
      'content-type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      origin: typeof window !== 'undefined' ? window.location.origin : this.serverUrl,
    };
  }

  private isRetryableError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const message = err.message.toLowerCase();
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('abort') ||
      message.includes('timeout') ||
      message.includes('failed') ||
      err.name === 'AbortError' ||
      err.name === 'TypeError'
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(`${this.serverUrl}${path}`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        const json = (await res.json()) as T | { success: false; error: { message: string } };
        if (!res.ok || (json as any).success === false) {
          const message = (json as any).error?.message ?? `MRcipher request failed: ${res.status}`;
          throw new Error(message);
        }
        return json as T;
      } catch (err) {
        clearTimeout(timer);
        lastError = err instanceof Error ? err : new Error(String(err));

        // Do not retry on authentication or client validation errors.
        if (!this.isRetryableError(lastError) || attempt === this.retries) {
          throw lastError;
        }

        const delay = this.retryDelayMs * 2 ** attempt;
        await this.sleep(delay);
      }
    }

    throw lastError ?? new Error('MRcipher request failed');
  }

  /**
   * Encrypt any JSON-serializable value through MRcipher.
   */
  async encrypt(value: unknown): Promise<MRCipherResult<EncryptedPayload>> {
    const res = await this.post<EncryptApiResponse>('/api/v1/encrypt', { content: value });
    return { data: res.data, meta: res.meta };
  }

  /**
   * Decrypt a payload previously produced by encrypt().
   */
  async decrypt<T = unknown>(payload: EncryptedPayload): Promise<MRCipherResult<T>> {
    const res = await this.post<DecryptApiResponse>('/api/v1/decrypt', { content: payload });
    return { data: res.data as T, meta: res.meta };
  }

  /**
   * Recursively walk an object and encrypt every field whose name matches
   * the configured encryptFields set. Dot notation is treated as a plain key.
   */
  private async encryptObject(obj: unknown): Promise<unknown> {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return Promise.all(obj.map((item) => this.encryptObject(item)));
    }

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (this.encryptFields.has(key) && value !== undefined) {
        const enc = await this.encrypt(value);
        out[key] = enc.data;
      } else {
        out[key] = await this.encryptObject(value);
      }
    }
    return out;
  }

  /**
   * Recursively decrypt every field whose name matches decryptFields.
   */
  private async decryptObject(obj: unknown): Promise<unknown> {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return Promise.all(obj.map((item) => this.decryptObject(item)));
    }

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (this.decryptFields.has(key) && this.isEncryptedPayload(value)) {
        const dec = await this.decrypt(value);
        out[key] = dec.data;
      } else {
        out[key] = await this.decryptObject(value);
      }
    }
    return out;
  }

  private isEncryptedPayload(value: unknown): value is EncryptedPayload {
    return (
      typeof value === 'object' &&
      value !== null &&
      'ciphertext' in value &&
      'iv' in value &&
      'tag' in value &&
      'version' in value
    );
  }

  /**
   * Drop-in fetch replacement. Encrypts configured request fields and decrypts
   * configured response fields automatically.
   *
   * The request body is only touched when it is a JSON string.
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    let body = options.body;

    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        const encrypted = await this.encryptObject(parsed);
        body = JSON.stringify(encrypted);
      } catch {
        // Not JSON; leave body untouched.
      }
    }

    const upstream = await fetch(url, { ...options, body });
    const text = await upstream.clone().text();

    let decryptedText = text;
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        const decrypted = await this.decryptObject(parsed);
        decryptedText = JSON.stringify(decrypted);
      } catch {
        // Not a decryptable JSON body.
      }
    }

    return new Response(decryptedText, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  }

  /**
   * Convenience wrapper for JSON POST requests.
   */
  async postJson<T = unknown>(url: string, body: unknown): Promise<T> {
    const res = await this.fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return (await res.json()) as T;
  }
}

/**
 * Create a global fetch interceptor. Returns an unmount function.
 *
 * WARNING: patching globals can conflict with other libraries. Prefer
 * MRCipherClient.fetch in your own code when possible.
 */
export function patchGlobalFetch(options: MRCipherOptions): () => void {
  const originalFetch = globalThis.fetch;
  const client = new MRCipherClient(options);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    return client.fetch(input.toString(), init ?? {});
  };

  return () => {
    globalThis.fetch = originalFetch;
  };
}
