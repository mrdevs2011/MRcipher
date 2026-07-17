'use client';

import { useState } from 'react';

export default function HomePage() {
  const [domain, setDomain] = useState('https://mrcipher.vercel.app');
  const [apiKey, setApiKey] = useState('');
  const [origin, setOrigin] = useState('');
  const [payload, setPayload] = useState(
    '{"email":"user@example.com","ssn":"123-45-6789"}',
  );
  const [curl, setCurl] = useState('');

  function generateCurl() {
    if (!domain || !apiKey || !origin) {
      setCurl('Iltimos, domen, API kalit va origin maydonlarini to\'ldiring.');
      return;
    }

    const url = `${domain.replace(/\/$/, '')}/api/v1/encrypt`;
    const command = `curl -X POST ${url} \\\n  -H "content-type: application/json" \\\n  -H "x-api-key: ${apiKey}" \\\n  -H "origin: ${origin}" \\\n  -d '{"content":${payload}}'`;

    setCurl(command);
  }

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
        qanday JSON-serializable ma&apos;lumot yuboring va AES-256-GCM
        shifrlangan qutini qaytarib oling.
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

      <h2>So&apos;rov yaratish</h2>
      <div
        style={{
          display: 'grid',
          gap: '1rem',
          background: '#f4f4f5',
          padding: '1rem',
          borderRadius: '0.5rem',
        }}
      >
        <label>
          <strong>Saytingiz domeni</strong>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="https://mrcipher.vercel.app"
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>

        <label>
          <strong>API kalitingiz</strong>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="mr_xxxxxxxx"
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>

        <label>
          <strong>Origin (ruxsat etilgan domen)</strong>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="https://app.example.com"
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>

        <label>
          <strong>Shifrlamoqchi ma&apos;lumot (JSON shaklida)</strong>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={4}
            placeholder='{"email":"user@example.com","ssn":"123-45-6789"}'
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>

        <button
          onClick={generateCurl}
          style={{
            padding: '0.75rem 1rem',
            background: '#18181b',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Next
        </button>
      </div>

      {curl && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>Tayyor curl buyruqi</h3>
          <pre
            style={{
              background: '#18181b',
              color: '#f4f4f5',
              padding: '1rem',
              borderRadius: '0.5rem',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {curl}
          </pre>
        </div>
      )}

      <p style={{ marginTop: '2rem', color: '#6b7280' }}>
        Firestore sozlamalari, kalit yaratish va xavfsizlik bo&apos;yicha
        ko&apos;rsatmalar uchun README faylini ko&apos;ring.
      </p>
    </main>
  );
}
