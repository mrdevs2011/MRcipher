# MRcipher

A universal, API-first Encryption-as-a-Service (EaaS) platform built with Next.js (App Router), Firebase Firestore, and Node.js `crypto` for AES-256-GCM encryption.

## Features

- **Generic payloads** — Encrypt any JSON-serializable value; no fixed schema required.
- **API-key authentication** — Keys are SHA-256 hashed in Firestore; raw keys are never stored.
- **Per-origin access control** — Each API key has an `allowed_domains` list.
- **AES-256-GCM** — Industry-standard authenticated encryption with a random IV per operation.
- **Modular architecture** — Encryption logic is isolated from HTTP handlers for easy testing.
- **Usage logging** — Best-effort Firestore logs for quota and audit trails.

## Project Structure

```
src/
├── app/
│   ├── api/v1/
│   │   ├── encrypt/route.ts   # POST /api/v1/encrypt
│   │   └── decrypt/route.ts   # POST /api/v1/decrypt
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── config.ts              # Environment variables and constants
│   ├── firebase.ts            # Firebase Admin SDK initialization
│   ├── crypto/
│   │   └── encryption.ts      # AES-256-GCM engine
│   ├── firestore/
│   │   ├── apiKeys.ts         # API-key validation and allowed-origin checks
│   │   └── logs.ts            # Usage logging
│   ├── middleware/
│   │   ├── apiKeyAuth.ts      # Request authentication logic
│   │   └── cors.ts            # Allowed-origin response helpers
│   ├── types/
│   │   └── index.ts           # Shared TypeScript interfaces
│   └── utils/
│       ├── errors.ts          # ApiError + type guard
│       └── response.ts          # Standard JSON response helpers
└── middleware.ts              # Next.js global middleware entry
```

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Firebase project and generate a service account key**

   - In the Firebase console, go to **Project Settings > Service Accounts**.
   - Click **Generate new private key** and download the JSON file.

3. **Configure environment variables**

   Copy `.env.example` to `.env.local` and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Description |
   | --- | --- |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON string of the service account key. |
   | `ENCRYPTION_MASTER_KEY` | 64-character hex string (32 bytes). Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
   | `ALLOWED_ORIGINS` | Optional comma-separated global origins for preflight/docs. |

   If you prefer not to paste the full JSON, you can use the individual `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` variables instead.

4. **Run the development server**

   ```bash
   npm run dev
   ```

## Firestore Schema

### `api_keys` collection

Each document represents an API key. Store only the SHA-256 hash; the raw key is shown once when created.

```json
{
  "user_id": "user_123",
  "key_hash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
  "allowed_domains": ["https://app.example.com", "http://localhost:3000"],
  "is_active": true,
  "created_at": "2026-07-17T00:00:00.000Z",
  "last_used_at": "2026-07-17T00:00:00.000Z"
}
```

### `logs` collection

Best-effort usage logs for audit and quota tracking.

```json
{
  "api_key_id": "key_doc_id",
  "user_id": "user_123",
  "endpoint": "encrypt",
  "status": "success",
  "bytes_in": 128,
  "bytes_out": 192,
  "origin": "https://app.example.com",
  "ip": "203.0.113.0",
  "created_at": "2026-07-17T00:00:00.000Z"
}
```

## API Usage

### Encrypt

```bash
curl -X POST https://mrcipher.vercel.app/api/v1/encrypt \
  -H "content-type: application/json" \
  -H "x-api-key: mr_xxxxxxxx" \
  -H "origin: https://app.example.com" \
  -d '{"content":{"email":"user@example.com","ssn":"123-45-6789"}}'
```

**Response**

```json
{
  "success": true,
  "data": {
    "ciphertext": "...",
    "iv": "...",
    "tag": "...",
    "version": "v1"
  },
  "meta": {
    "bytes_in": 64,
    "bytes_out": 148
  }
}
```

### Decrypt

```bash
curl -X POST https://mrcipher.vercel.app/api/v1/decrypt \
  -H "content-type: application/json" \
  -H "x-api-key: mr_xxxxxxxx" \
  -H "origin: https://app.example.com" \
  -d '{"content":{"ciphertext":"...","iv":"...","tag":"...","version":"v1"}}'
```

**Response**

```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "ssn": "123-45-6789"
  },
  "meta": {
    "bytes_in": 148,
    "bytes_out": 64
  }
}
```

## Creating API Keys

Use the Firebase console, the Firestore REST API, or a small Node.js script to add documents to the `api_keys` collection:

```javascript
const crypto = require('crypto');

const rawKey = `mr_${crypto.randomBytes(32).toString('base64url')}`;
const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

// Save to Firestore:
// {
//   user_id: 'user_123',
//   key_hash: keyHash,
//   allowed_domains: ['https://app.example.com'],
//   is_active: true
// }

console.log('Raw key (show once):', rawKey);
```

## Security Notes

- **Never** commit `.env.local` or Firebase service account files to version control.
- The raw `ENCRYPTION_MASTER_KEY` and raw API keys exist only as environment variables / client headers.
- All plain text and keys are excluded from API responses and server logs.
- Allowed origins are enforced per API key.
- Input size is limited to 1 MB via `next.config.js`.
- Decryption failures return a generic error; the exact failure reason is logged server-side only.

## Scripts

- `npm run dev` — Start the development server.
- `npm run build` — Build for production.
- `npm run start` — Start the production server.
- `npm run lint` — Run ESLint.
- `npm run typecheck` — Run TypeScript without emitting files.

## License

MIT
