'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Logo } from '@/components/Logo';
import { ApiKeyPublicView } from '@/lib/types';

export default function HomePage() {
  const { user, loading, signInWithGoogle, logout, refreshIdToken } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyPublicView[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [freshApiKey, setFreshApiKey] = useState('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const loadApiKeys = useCallback(async () => {
    setError('');
    try {
      const freshToken = await refreshIdToken();
      if (!freshToken) {
        setError('ID token topilmadi, qayta kiring.');
        return;
      }

      const res = await fetch('/api/v1/keys', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${freshToken}`,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || 'API key lar ro&apos;yxatini yuklashda xatolik');
        return;
      }

      setApiKeys(json.data.keys ?? []);
    } catch (err) {
      setError('Tarmoq xatosi: API key lar ro&apos;yxati yuklanmadi');
    }
  }, [refreshIdToken]);

  async function createApiKey() {
    setApiKeyLoading(true);
    setError('');
    setFreshApiKey('');

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
        body: JSON.stringify({ name: newKeyName.trim() || 'Nomsiz kalit' }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || 'API key yaratishda xatolik');
        setApiKeyLoading(false);
        return;
      }

      setFreshApiKey(json.data.apiKey);
      setNewKeyName('');
      await loadApiKeys();
    } catch (err) {
      setError('Tarmoq xatosi: API key yaratilmadi');
    } finally {
      setApiKeyLoading(false);
    }
  }

  function copyApiKey() {
    if (!freshApiKey) return;
    navigator.clipboard.writeText(freshApiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const integrationCode = freshApiKey
    ? `const SERVER_URL = "${typeof window !== 'undefined' ? window.location.origin : 'https://mrcipher.vercel.app'}";
const API_KEY = "${freshApiKey}";

async function encrypt(content) {
  const res = await fetch(\`\${SERVER_URL}/api/v1/encrypt\`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: \`Bearer \${API_KEY}\`,
      origin: SERVER_URL,
    },
    body: JSON.stringify({ content }),
  });
  return res.json();
}

async function decrypt(encrypted) {
  const res = await fetch(\`\${SERVER_URL}/api/v1/decrypt\`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: \`Bearer \${API_KEY}\`,
      origin: SERVER_URL,
    },
    body: JSON.stringify({ content: encrypted }),
  });
  return res.json();
}`
    : '';

  function copyIntegrationCode() {
    if (!integrationCode) return;
    navigator.clipboard.writeText(integrationCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
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
              <h2>API key larni boshqarish</h2>
              <p>
                Yangi API key yaratish va mavjud key larni ko&apos;rish uchun
                avval Google hisobingiz bilan kiring.
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

              <h3 className="card-title mb-1">Yangi API key yaratish</h3>
              <p className="card-desc">
                Kalitga tushunarli nom bering. Asl key faqat bir marta
                ko&apos;rsatiladi va keyin tiklab bo&apos;lmaydi.
              </p>

              <div className="generator-grid" style={{ marginBottom: '1rem' }}>
                <label className="block">
                  API key nomi
                  <input
                    type="text"
                    className="input"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Masalan: Production server"
                    maxLength={100}
                  />
                </label>

                <button
                  className="btn btn-primary"
                  onClick={createApiKey}
                  disabled={apiKeyLoading}
                >
                  {apiKeyLoading ? 'Yaratilmoqda...' : 'API key yaratish'}
                </button>
              </div>

              {freshApiKey && (
                <div
                  style={{
                    background: '#020617',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 0.5rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Yangi API key (faqat bir marta ko&apos;rsatiladi, nusxa oling):
                  </p>
                  <code
                    style={{
                      wordBreak: 'break-all',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {freshApiKey}
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
                    {copied ? 'Nusxa olindi!' : 'API key ni nusxa olish'}
                  </button>
                </div>
              )}

              {integrationCode && (
                <div className="mt-2">
                  <h3 className="card-title">Integratsiya namunasi</h3>
                  <p className="card-desc">
                    Ushbu kodni dasturingizga qo&apos;shing. Kod ichidagi{' '}
                    <code>API_KEY</code> o&apos;rniga yuqoridagi API key ni
                    yozing.
                  </p>
                  <pre className="code-block">{integrationCode}</pre>
                  <button
                    className="btn btn-secondary"
                    onClick={copyIntegrationCode}
                  >
                    {codeCopied ? 'Nusxa olindi!' : 'Kodni nusxa olish'}
                  </button>
                </div>
              )}

              {error && (
                <p style={{ color: 'var(--danger)', marginTop: '0.75rem' }}>
                  {error}
                </p>
              )}

              <h3
                className="card-title mb-1"
                style={{ marginTop: '2rem' }}
              >
                Saqlangan API key lar
              </h3>
              <p className="card-desc">
                Faqat oxirgi 4 ta belgi va nom ko&apos;rsatiladi. Asl keyni
                tiklab bo&apos;lmaydi.
              </p>

              {apiKeys.length === 0 ? (
                <p className="text-muted">Hali API key yaratilmagan.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {apiKeys.map((key) => (
                    <li
                      key={key.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <div>
                        <strong>{key.name}</strong>
                        <div
                          style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            marginTop: '0.25rem',
                          }}
                        >
                          Prefix: ····{key.prefix}
                          {key.revoked && (
                            <span
                              style={{
                                color: 'var(--danger)',
                                marginLeft: '0.5rem',
                              }}
                            >
                              (bekor qilingan)
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {new Date(key.created_at).toLocaleDateString('uz-UZ')}
                      </span>
                    </li>
                  ))}
                </ul>
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
