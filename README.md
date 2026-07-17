# MRcipher

Next.js (App Router), Firebase Firestore va Node.js `crypto` yordamida AES-256-GCM shifrlash orqali qurilgan universal, API-first Encryption-as-a-Service (EaaS) platformasi.

## Xususiyatlar

- **Generic payloadlar** — Har qanday JSON-serializable qiymatni shifrlash; ma'lumot tuzilmasi farqi yo'q.
- **API kalit bilan autentifikatsiya** — Kalitlar Firestore'ga SHA-256 hash shaklida saqlanadi; asl kalit hech qachon saqlanmaydi.
- **Domenboshqaruv** — Har bir API kalit o'zining `allowed_domains` ro'yxatiga ega.
- **AES-256-GCM** — Har bir operatsiya uchun yangi tasodifiy IV bilan sanoat standartidagi autentifikatsiyali shifrlash.
- **Modul arxitektura** — Shifrlash mantig'i HTTP handlerlaridan ajratilgan, alohida test qilish oson.
- **Foydalanish loglari** — Kvota va audit izlari uchun eng yaxshi imkoniyatlarda Firestore loglari.

## Loyiha tuzilishi

```
src/
├── app/
│   ├── api/v1/
│   │   ├── encrypt/route.ts   # POST /api/v1/encrypt
│   │   └── decrypt/route.ts   # POST /api/v1/decrypt
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── config.ts              # Muhit o'zgaruvchilari va konstantalar
│   ├── firebase.ts            # Firebase Admin SDK ishga tushirish
│   ├── crypto/
│   │   └── encryption.ts      # AES-256-GCM dvigatel
│   ├── firestore/
│   │   ├── apiKeys.ts         # API kalitini tekshirish va domen ruxsatini tekshirish
│   │   └── logs.ts            # Foydalanish loglari
│   ├── middleware/
│   │   ├── apiKeyAuth.ts      # So'rov autentifikatsiyasi mantig'i
│   │   └── cors.ts            # Ruxsat etilgan domen javob yordamchilari
│   ├── types/
│   │   └── index.ts           # Shared TypeScript interfeyslari
│   └── utils/
│       ├── errors.ts          # ApiError + type guard
│       └── response.ts        # Standart JSON javob yordamchilari
└── middleware.ts              # Next.js global middleware kirish nuqtasi
```

## O'rnatish

1. **Bog'liqliklarni o'rnatish**

   ```bash
   npm install
   ```

2. **Firebase loyihasi yaratish va service account kalitini yaratish**

   - Firebase console'da **Project Settings > Service Accounts** bo'limiga kiring.
   - **Generate new private key** tugmasini bosing va JSON faylni yuklab oling.

3. **Muhit o'zgaruvchilarini sozlash**

   `.env.example` faylini `.env.local` ga nusxa oling va qiymatlarni to'ldiring:

   ```bash
   cp .env.example .env.local
   ```

   | O'zgaruvchi | Tavsif |
   | --- | --- |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | Service account kalitining to'liq JSON matni. |
   | `ENCRYPTION_MASTER_KEY` | 64 ta belgidan iborat hex satr (32 bayt). `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` bilan yarating. |
   | `ALLOWED_ORIGINS` | Ixtiyoriy, preflight/health check uchun global domenlar ro'yxati. |

   Agar to'liq JSON ni joylamoqchi bo'lmasangiz, alohida `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` va `FIREBASE_PRIVATE_KEY` o'zgaruvchilaridan foydalanishingiz mumkin.

4. **Rivojlanish serverini ishga tushirish**

   ```bash
   npm run dev
   ```

## Firestore sxemasi

### `api_keys` kolleksiyasi

Har bir hujjat bitta API kalitini ifodalaydi. Faqat SHA-256 hash saqlanadi; asl kalit faqat bir marta ko'rsatiladi.

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

### `logs` kolleksiyasi

Audit va kvota kuzatuvi uchun eng yaxshi imkoniyatlarda loglar.

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

## API'dan foydalanish

### Shifrlash

```bash
curl -X POST https://mrcipher.vercel.app/api/v1/encrypt \
  -H "content-type: application/json" \
  -H "x-api-key: mr_xxxxxxxx" \
  -H "origin: https://app.example.com" \
  -d '{"content":{"email":"user@example.com","ssn":"123-45-6789"}}'
```

**Javob**

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

### Shifrdan ochish

```bash
curl -X POST https://mrcipher.vercel.app/api/v1/decrypt \
  -H "content-type: application/json" \
  -H "x-api-key: mr_xxxxxxxx" \
  -H "origin: https://app.example.com" \
  -d '{"content":{"ciphertext":"...","iv":"...","tag":"...","version":"v1"}}'
```

**Javob**

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

## API kalitlarini yaratish

Firebase console, Firestore REST API yoki kichik Node.js skript yordamida `api_keys` kolleksiyasiga hujjatlar qo'shing:

```javascript
const crypto = require('crypto');

const rawKey = `mr_${crypto.randomBytes(32).toString('base64url')}`;
const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

// Firestore'ga saqlash:
// {
//   user_id: 'user_123',
//   key_hash: keyHash,
//   allowed_domains: ['https://app.example.com'],
//   is_active: true
// }

console.log('Asl kalit (faqat bir marta ko\'rsatiladi):', rawKey);
```

## Xavfsizlik eslatmalari

- `.env.local` va Firebase service account fayllarini **hech qachon** version control'ga qo'shmang.
- Asl `ENCRYPTION_MASTER_KEY` va asl API kalitlar faqat muhit o'zgaruvchilari / client headerlarida mavjud.
- Barcha oddiy matn va kalitlar API javoblaridan va server loglaridan olib tashlangan.
- Ruxsat etilgan domenlar har bir API kalit bo'yicha majburiy qilinadi.
- Kiritish hajmi `next.config.js` orqali 1 MB bilan cheklangan.
- Shifrdan ochish muvaffaqiyatsizligi bo'lganda umumiy xato qaytariladi; aniq sabab faqat server tomonda loglanadi.

## Skriptlar

- `npm run dev` — Rivojlanish serverini ishga tushirish.
- `npm run build` — Production uchun build.
- `npm run start` — Production serverini ishga tushirish.
- `npm run lint` — ESLint ni ishga tushirish.
- `npm run typecheck` — TypeScript fayllarni tekshirish, hech narsa chiqarmasdan.

## Litsenziya

MIT
