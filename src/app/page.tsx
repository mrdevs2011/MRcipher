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

  useEffect(() => {
    if (user) {
      loadApiKeys();
    }
  }, [user, loadApiKeys]);

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
        <Logo size={48} />
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <nav className="navbar">
        <div className="navbar-inner container">
          <a href="/" className="brand">
            <Logo size={32} />
            MRcipher
          </a>
          {user ? (
            <div className="nav-user">
              <span className="text-muted">{user.email}</span>
              <button className="btn btn-secondary" onClick={logout}>
                Chiqish
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={signInWithGoogle}>
              Google bilan kirish
            </button>
          )}
        </div>
      </nav>

      <main style={{ padding: '2rem 0' }}>
        {!user ? (
          <div className="card empty-state">
            <Logo size={64} />
            <h1 style={{ marginBottom: '0.5rem' }}>MRcipher</h1>
            <p className="text-muted" style={{ maxWidth: '420px' }}>
              API-first Encryption-as-a-Service. AES-256-GCM shifrlash bilan
              har qanday JSON malumotni himoyalang.
            </p>
            <button
              className="btn btn-primary"
              onClick={signInWithGoogle}
              style={{ marginTop: '1rem' }}
            >
              Google bilan boshlash
            </button>
          </div>
        ) : (
          <>
            <section className="card" style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem' }}>
                    API key boshqaruvi
                  </h2>
                  <p className="text-muted" style={{ margin: 0 }}>
                    {user.email}
                  </p>
                </div>
                <button className="btn btn-secondary" onClick={logout}>
                  Chiqish
                </button>
              </div>
            </section>

            <section className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 className="card-title">Yangi API key yaratish</h3>
              <p className="card-desc">
                Asl key faqat bir marta ko&apos;rsatiladi va tiklab
                bo&apos;lmaydi. Maxfiy saqlang.
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
                <div className="code-block" style={{ marginBottom: '1rem' }}>
                  <p
                    style={{
                      margin: '0 0 0.5rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Yangi API key (faqat bir marta):
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
                      background: copied ? 'var(--success)' : 'transparent',
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
                    Ushbu kodni dasturingizga qo&apos;shing.
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
            </section>

            <section className="card">
              <h3 className="card-title">Saqlangan API key lar</h3>
              <p className="card-desc">
                Faqat nom va oxirgi 4 ta belgi ko&apos;rsatiladi. Asl key
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
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          mr_····{key.prefix}
                          {key.revoked && (
                            <span
                              style={{
                                color: 'var(--danger)',
                                marginLeft: '0.5rem',
                                fontFamily: 'var(--font-sans)',
                              }}
                            >
                              bekor qilingan
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
            </section>

            <section className="card" style={{ marginTop: '1.5rem' }}>
              <h3 className="card-title">Endpointlar</h3>
              <p className="card-desc">
                Har bir so&apos;rovda <code>Authorization: Bearer &lt;apiKey&gt;</code>
                sarlavhasini yuboring.
              </p>
              <pre className="code-block">{`POST /api/v1/encrypt
POST /api/v1/decrypt`}</pre>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <p className="text-muted">
          MRcipher — AES-256-GCM Encryption-as-a-Service
        </p>
      </footer>
    </div>
  );
}
