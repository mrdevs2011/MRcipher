# MRcipher Universal SDK

Drop-in encryption layer for any frontend or backend project.

## What it does

- Auto-encrypts configured fields before they leave the browser.
- Auto-decrypts configured fields when they come back from your server.
- Keeps plaintext off your database and request logs.
- Works with any API: `fetch`, `XMLHttpRequest`, Next.js, Express, etc.

## Files

- `client.ts` — browser/client SDK (`MRCipherClient`)
- `server.ts` — Node.js/Next.js server SDK (`MRCipherServer`, middleware)
- `react.ts` — React hooks (`useMRCipher`, `useEncryptedField`)
- `types.ts` — shared TypeScript types

## Quick start

### Frontend auto-encrypt

```ts
import { MRCipherClient } from './mrcipher-sdk';

const cipher = new MRCipherClient({
  serverUrl: 'https://mrcipher.vercel.app',
  apiKey: 'mr_your_api_key_here',
  encryptFields: ['phone', 'otp', 'email'],
  decryptFields: ['phone', 'otp'],
});

// Manual encrypt/decrypt
const { data: encryptedPhone } = await cipher.encrypt('+998901234567');
const { data: phone } = await cipher.decrypt<string>(encryptedPhone);

// Auto-encrypt fetch wrapper
const res = await cipher.fetch('https://your-api.com/api/send-otp', {
  method: 'POST',
  body: JSON.stringify({ phone: '+998901234567' }),
});
const data = await res.json();
```

### React hook

```tsx
import { useMRCipher } from './mrcipher-sdk/react';

function OtpForm() {
  const { secureFetch, isLoading, error } = useMRCipher({
    serverUrl: 'https://mrcipher.vercel.app',
    apiKey: 'mr_your_api_key_here',
    encryptFields: ['phone', 'otp'],
    decryptFields: ['phone', 'otp'],
  });

  const sendOtp = async (values: { phone: string }) => {
    const res = await secureFetch('https://your-api.com/api/send-otp', {
      method: 'POST',
      body: JSON.stringify(values),
    });
    return await res.json();
  };

  return <form onSubmit={(e) => sendOtp({ phone: e.currentTarget.phone.value })}>...</form>;
}
```

### Next.js server middleware

```ts
import { withEncryptedBody } from './mrcipher-sdk/server';
import { NextResponse } from 'next/server';

export const POST = withEncryptedBody(
  {
    serverUrl: 'https://mrcipher.vercel.app',
    apiKey: process.env.MR_CIPHER_API_KEY!,
    encryptFields: ['phone', 'otp'],
  },
  async (req) => {
    const body = await req.json(); // phone and otp are already encrypted
    await db.saveOtpRequest(body);
    return NextResponse.json({ ok: true });
  }
);
```

### OTP flow example

```ts
import { MRCipherServer } from './mrcipher-sdk/server';

const cipher = new MRCipherServer({ serverUrl, apiKey: process.env.MR_CIPHER_API_KEY! });

async function sendOtp(phone: string) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Send plain OTP via SMS/messenger
  await smsProvider.send(phone, `Your code: ${otp}`);

  // Store encrypted OTP only
  const { data: encryptedOtp } = await cipher.encrypt(otp);
  await db.setOtp(phone, encryptedOtp);
}

async function verifyOtp(phone: string, enteredOtp: string) {
  const encryptedOtp = await db.getOtp(phone);
  const { data: realOtp } = await cipher.decrypt<string>(encryptedOtp);

  const isValid = realOtp === enteredOtp;

  // Do not log or store realOtp
  await db.deleteOtp(phone);
  return isValid;
}
```

## How to integrate into any project

1. Copy the `mrcipher-sdk` folder into your project.
2. Replace `serverUrl` and `apiKey` with your MRcipher credentials.
3. List the sensitive fields in `encryptFields` and `decryptFields`.
4. Use `cipher.fetch()` or the server middleware — MRcipher handles the rest.
