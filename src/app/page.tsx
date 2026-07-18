'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Logo } from '@/components/Logo';

export default function HomePage() {
  const { user, loading, signInWithGoogle, logout, refreshIdToken } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function fetchApiKey() {
    setApiKeyLoading(true);
    setError('');

    try {
      const freshToken = await refreshIdToken();
      if (!freshToken) {
        setError('ID token topilmadi, qayta kiring.');
        setApiKeyLoading(false);
        return;
      }

      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || 'API key olishda xatolik');
        setApiKeyLoading(false);
        return;
      }

      setApiKey(json.data.apiKey);
    } catch (err) {
      setError('Tarmoq xatosi: API key olinmadi');
    } finally {
      setApiKeyLoading(false);
    }
  }

  function copyApiKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
              Har qanday dasturlash tilidan ishlatish oson.
            </p>
          </div>
          <div className="card">
            <div className="feature-icon">🛡️</div>
            <h3 className="card-title">Google Sign-In</h3>
            <p className="card-desc">
              Avval Google bilan kiring, keyin API key oling. So&apos;rovlaringizni
              shu API key bilan himoyalang.
            </p>
          </div>
        </section>

        <section className="grid-2">
          <div className="card">
            <h3 className="card-title">Endpointlar</h3>
            <p className="card-desc">
              Quyidagi endpointlarga{' '}
              <code>Authorization: Bearer &lt;apiKey&gt;</code> sarlavhasi bilan
              so&apos;rov yuboring.
            </p>
            <ul className="text-muted" style={{ lineHeight: 1.8 }}>
              <li>
                <code>POST /api/v1/keys</code> — yangi API key yaratish (Google
                token bilan)
              </li>
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

        <section style={{ margin: '2rem 0' }}>
          {!user ? (
            <div className="card empty-state">
              <h2>API key olish</h2>
              <p>
                Yangi API key yaratish uchun avval Google hisobingiz bilan
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
                  <span className="email">{user.email}</span> sifatida ishlash
                </p>
              </div>

              <h3 className="card-title mb-1">API key</h3>
              <p className="card-desc">
                Google hisobingiz bilan kiringandan keyin yangi API key
                yarating. Bu keyni dasturingizga qo&apos;shing va har bir so&apos;rovda
                <code>Authorization: Bearer &lt;apiKey&gt;</code> sarlavhasida
                yuboring.
              </p>

              {!apiKey ? (
                <button
                  className="btn btn-primary"
                  onClick={fetchApiKey}
                  disabled={apiKeyLoading}
                >
                  {apiKeyLoading ? 'Yaratilmoqda...' : 'API key olish'}
                </button>
              ) : (
                <div
                  style={{
                    background: '#020617',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 0.5rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Sizning API key ingiz (faqat bir marta ko&apos;rsatiladi):
                  </p>
                  <code
                    style={{
                      wordBreak: 'break-all',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {apiKey}
                  </code>
                  <button
                    onClick={copyApiKey}
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.375rem 0.75rem',
                      background: copied ? 'var(--success)' : 'var(--bg-input)',
                      color: copied ? '#020617' : 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    {copied ? 'Nusxa olindi!' : 'Nusxa olish'}
                  </button>
                </div>
              )}

              {error && (
                <p style={{ color: 'var(--danger)', marginTop: '0.75rem' }}>
                  {error}
                </p>
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
