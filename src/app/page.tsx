export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '2rem 1rem',
        lineHeight: 1.6,
      }}
    >
      <h1>MRcipher</h1>
      <p>
        Universal, API-first Encryption-as-a-Service. Quyidagi endpointlarga har
        qanday JSON-serializable ma'lumot yuboring va AES-256-GCM shifrlangan
        qutini qaytarib oling.
      </p>

      <h2>API Endpointlar</h2>
      <ul>
        <li>
          <code>POST /api/v1/encrypt</code> — JSON qiymatni shifrlash.
        </li>
        <li>
          <code>POST /api/v1/decrypt</code> — Shifrlangan qutini ochish.
        </li>
      </ul>

      <h2>Headerlar</h2>
      <ul>
        <li>
          <code>x-api-key</code> — Sizning API kalitingiz (majburiy).
        </li>
        <li>
          <code>origin</code> — Kalitingiz uchun ruxsat etilgan domen bilan
          mos kelishi kerak.
        </li>
        <li>
          <code>content-type: application/json</code>
        </li>
      </ul>

      <h2>Misol</h2>
      <pre
        style={{
          background: '#f4f4f5',
          padding: '1rem',
          borderRadius: '0.5rem',
          overflowX: 'auto',
        }}
      >
        {`curl -X POST https://mrcipher.vercel.app/api/v1/encrypt \\
  -H "content-type: application/json" \\
  -H "x-api-key: mr_xxxxxxxx" \\
  -H "origin: https://app.example.com" \\
  -d '{"content":{"email":"user@example.com","ssn":"123-45-6789"}}'`}
      </pre>

      <p style={{ marginTop: '2rem', color: '#6b7280' }}>
        Firestore sozlamalari, kalit yaratish va xavfsizlik bo'yicha ko'rsatmalar
        uchun README faylini ko'ring.
      </p>
    </main>
  );
}
