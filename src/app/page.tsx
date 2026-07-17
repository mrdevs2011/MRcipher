'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

export default function HomePage() {
  const { user, loading, idToken, signInWithGoogle, logout, refreshIdToken } = useAuth();
  const [domain, setDomain] = useState('https://mrcipher.vercel.app');
  const [payload, setPayload] = useState(
    '{"email":"user@example.com","ssn":"123-45-6789"}',
  );
  const [curl, setCurl] = useState('');

  async function generateCurl() {
    if (!user || !idToken) {
      setCurl('Iltimos, avval Google hisobingiz bilan kiring.');
      return;
    }

    const freshToken = await refreshIdToken();
    if (!freshToken) {
      setCurl('ID tokenni yangilash muvaffaqiyatsiz boldi, qayta kiring.');
      return;
    }

    if (!domain) {
      setCurl('Iltimos, domen maydonini toldiring.');
      return;
    }

    const url = `${domain.replace(/\/$/, '')}/api/v1/encrypt`;
    const command = `curl -X POST ${url} \\\n  -H "content-type: application/json" \\\n  -H "Authorization: Bearer ${freshToken}" \\\n  -H "origin: ${typeof window !== 'undefined' ? window.location.origin : domain}" \\\n  -d '{"content":${payload}}'`;

    setCurl(command);
  }

  if (loading) {
    return (
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <p>Yuklanmoqda...</p>
      </main>
    );
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <svg width="48" height="48" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="90" fill="#0f172a" stroke="#38bdf8" strokeWidth="6" />
          <text
            x="50%"
            y="58%"
            fontFamily="monospace"
            fontWeight="bold"
            fontSize="75"
            fill="#ffffff"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            ***
          </text>
        </svg>
        <h1 style={{ margin: 0 }}>MRcipher</h1>
      </div>
      <p>
        Universal, API-first Encryption-as-a-Service. Quyidagi endpointlarga har
        qanday JSON-serializable malumot yuboring va AES-256-GCM shifrlangan
        qutini qaytarib oling.
      </p>

      {!user ? (
        <div style={{ marginTop: '1.5rem' }}>
          <p>Ishni boshlash uchun Google hisobingiz bilan kiring.</p>
          <button
            onClick={signInWithGoogle}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#18181b',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Google bilan kirish
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f4f4f5',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginTop: '1.5rem',
            }}
          >
            <div>
              <strong>Kirish muvaffaqiyatli</strong>
              <p style={{ margin: 0, color: '#6b7280' }}>{user.email}</p>
            </div>
            <button
              onClick={logout}
              style={{
                padding: '0.5rem 1rem',
                background: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer',
              }}
            >
              Chiqish
            </button>
          </div>

          <h2 style={{ marginTop: '2rem' }}>API Endpointlar</h2>
          <ul>
            <li>
              <code>POST /api/v1/encrypt</code> — JSON qiymatni shifrlash.
            </li>
            <li>
              <code>POST /api/v1/decrypt</code> — Shifrlangan qutini ochish.
            </li>
          </ul>

          <h2>Sorov yaratish</h2>
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
              <strong>Shifrlamoqchi malumot (JSON shaklida)</strong>
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
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Eslatma: ID token 1 soatdan keyin eskiradi, shuning uchun
                har safar yangi curl yaratish shart.
              </p>
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
        </>
      )}

      <p style={{ marginTop: '2rem', color: '#6b7280' }}>
        Firestore sozlamalari, kalit yaratish va xavfsizlik boyicha
        korsatmalar uchun README faylini koring.
      </p>
    </main>
  );
}
