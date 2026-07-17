'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Logo } from '@/components/Logo';

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
    const origin = typeof window !== 'undefined' ? window.location.origin : domain;
    const command = `curl -X POST ${url} \\\n  -H "content-type: application/json" \\\n  -H "Authorization: Bearer ${freshToken}" \\\n  -H "origin: ${origin}" \\\n  -d '{"content":${payload}}'`;

    setCurl(command);
  }

  if (loading) {
    return (
      <div className="empty-state">
        <Logo size={64} />
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <nav className="navbar">
        <div className="navbar-inner container">
          <a href="/" className="brand">
            <Logo size={36} />
            MRcipher
          </a>
          {user ? (
            <div className="nav-user">
              <span>
                <strong>{user.displayName || user.email}</strong> sifatida kiringansiz
              </span>
              <button className="btn btn-secondary" onClick={logout}>
                Chiqish
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={signInWithGoogle}>
              Kirish
            </button>
          )}
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="badge">
            <span className="badge-dot" />
            AES-256-GCM shifrlash
          </div>
          <h1>
            Malumotlaringizni <span>API orqali</span> shifrlang
          </h1>
          <p>
            MRcipher — universal, API-first Encryption-as-a-Service. JSON
            malumotlaringizni har qanday dasturlash tilidan yuboring, biz uni
            xavfsiz shifrlab qaytarib beramiz.
          </p>
          {!user && (
            <button className="btn btn-primary" onClick={signInWithGoogle}>
              Google bilan boshlash
            </button>
          )}
        </section>

        <section className="grid-3">
          <div className="card">
            <div className="feature-icon">🔐</div>
            <h3 className="card-title">AES-256-GCM</h3>
            <p className="card-desc">
              Zamonaviy autentifikatsiyalangan shifrlash. Har bir foydalanuvchi
              uchun alohida kalit.
            </p>
          </div>
          <div className="card">
            <div className="feature-icon">⚡</div>
            <h3 className="card-title">API-first</h3>
            <p className="card-desc">
              Faqat 2 endpoint: <code>/encrypt</code> va <code>/decrypt</code>.
              Curl, Postman yoki har qanday HTTP mijoz bilan ishlaydi.
            </p>
          </div>
          <div className="card">
            <div className="feature-icon">🛡️</div>
            <h3 className="card-title">Google Sign-In</h3>
            <p className="card-desc">
              API kalitlari yoq. Faqat Google hisobingiz bilan kiring va har bir
              sorovga ID token yuboring.
            </p>
          </div>
        </section>

        <section className="grid-2">
          <div className="card">
            <h3 className="card-title">Endpointlar</h3>
            <p className="card-desc">
              Quyidagi endpointlarga <code>Authorization: Bearer &lt;idToken&gt;</code>{' '}
              sarlavhasi bilan sorov yuboring.
            </p>
            <ul className="text-muted" style={{ lineHeight: 1.8 }}>
              <li>
                <code>POST /api/v1/encrypt</code> — JSON qiymatni shifrlash
              </li>
              <li>
                <code>POST /api/v1/decrypt</code> — shifrlangan qutini ochish
              </li>
            </ul>
          </div>

          <div className="card">
            <h3 className="card-title">Qo&apos;llab-quvvatlanadi</h3>
            <p className="card-desc">
              Server va brauzer, har qanday til va platforma:
            </p>
            <ul className="text-muted" style={{ lineHeight: 1.8 }}>
              <li>cURL, Python requests, Node.js fetch</li>
              <li>Java, Go, PHP, Rust HTTP mijozlari</li>
              <li>Next.js, React, Vue, mobil ilovalar</li>
            </ul>
          </div>
        </section>

        <section className="generator">
          {!user ? (
            <div className="card empty-state">
              <h2>Curl generator</h2>
              <p>
                Tayyor curl buyruqlarini yaratish uchun avval Google bilan
                kiring.
              </p>
              <button className="btn btn-primary" onClick={signInWithGoogle}>
                Google bilan kirish
              </button>
            </div>
          ) : (
            <div className="card">
              <div className="auth-bar">
                <p>
                  <span className="email">{user.email}</span> sifatida test
                  sorovi yaratish
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    await refreshIdToken();
                    setCurl('');
                  }}
                >
                  Tokenni yangilash
                </button>
              </div>

              <h3 className="card-title mb-1">Curl generator</h3>
              <p className="card-desc">
                Domen va shifrlamoqchi malumotingizni kiriting, biz tayyor curl
                buyruqni yaratib beramiz.
              </p>

              <div className="generator-grid">
                <label className="block">
                  Saytingiz domeni
                  <input
                    type="text"
                    className="input"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="https://mrcipher.vercel.app"
                  />
                </label>

                <label className="block">
                  Shifrlamoqchi malumot (JSON shaklida)
                  <textarea
                    className="textarea"
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    rows={4}
                    placeholder='{"email":"user@example.com","ssn":"123-45-6789"}'
                  />
                </label>

                <button className="btn btn-primary" onClick={generateCurl}>
                  Next
                </button>
              </div>

              {curl && (
                <div className="mt-2">
                  <h3 className="card-title">Tayyor curl buyruqi</h3>
                  <p className="card-desc">
                    ID token 1 soatdan keyin eskiradi, har safar yangi sorov
                    yaratish shart.
                  </p>
                  <pre className="code-block">{curl}</pre>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>
          © {new Date().getFullYear()} MRcipher.{' '}
          <span className="text-primary">AES-256-GCM</span> bilan himoyalangan.
        </p>
      </footer>
    </div>
  );
}
