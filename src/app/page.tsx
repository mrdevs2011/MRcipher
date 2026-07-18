'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Logo } from '@/components/Logo';
import { CodeTemplates } from '@/components/CodeTemplates';
import { ApiKeyPublicView } from '@/lib/types';

export default function HomePage() {
  const { user, loading, signInWithGoogle, logout, refreshIdToken, signInError, clearSignInError } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyPublicView[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [freshApiKey, setFreshApiKey] = useState('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
        setError(json.error?.message || 'API keylar ro\'yxatini yuklashda xatolik');
        return;
      }

      setApiKeys(json.data.keys ?? []);
    } catch (err) {
      setError('Tarmoq xatosi: API keylar ro\'yxati yuklanmadi');
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

  if (loading) {
    return (
      <div className="empty-state">
        <Logo size={48} />
        <p className="text-muted">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <nav className="navbar">
        <div className="navbar-inner container">
          <a href="/" className="brand">
            <Logo size={28} />
            MRcipher
          </a>
          {user ? (
            <div className="nav-user">
              <span className="email">{user.email}</span>
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                Chiqish
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={signInWithGoogle}>
              Google bilan kirish
            </button>
          )}
        </div>
      </nav>

      <main style={{ padding: '2.5rem 0' }}>
        {!user ? (
          <section className="hero">
            <div className="badge">
              <span className="badge-dot" />
              AES-256-GCM Encryption-as-a-Service
            </div>

            <Logo size={80} />
            <h1 style={{ marginTop: '1.5rem' }}>
              Himoyalang<span>.</span> Har qanday ma&apos;lumot.
            </h1>
            <p>
              MRcipher serverlaringiz va ma&apos;lumotlaringiz o&apos;rtasida shifrlash
              qatlami bo&apos;lib xizmat qiladi. Bir marta ulang, qolganini biz hal
              qilamiz.
            </p>

            {signInError && (
              <div className="alert alert-error" style={{ maxWidth: 420, margin: '0 auto 1rem' }}>
                <span className="alert-icon">!</span>
                <div style={{ flex: 1 }}>
                  {signInError}
                  <button className="btn btn-ghost btn-sm" onClick={clearSignInError} style={{ marginLeft: '0.5rem' }}>
                    Yopish
                  </button>
                </div>
              </div>
            )}

            <button className="btn btn-primary" onClick={signInWithGoogle}>
              Google bilan boshlash
            </button>

            <div className="grid-3 mt-2" style={{ maxWidth: 900, margin: '3rem auto 0' }}>
              <div className="feature-card">
                <div className="feature-icon"><span>&#128274;</span></div>
                <div className="feature-title">AES-256-GCM</div>
                <p className="feature-desc">Zamonaviy autentifikatsiyalik shifrlash. Har bir foydalanuvchi o&apos;z kalitiga ega.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><span>&#9889;</span></div>
                <div className="feature-title">Drop-in SDK</div>
                <p className="feature-desc">Bir necha qatorda ulang. Avtomatik shifrlash va ochish — JavaScript, Python, Go, PHP, Java.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><span>&#128172;</span></div>
                <div className="feature-title">API-first</div>
                <p className="feature-desc">Har qanday backendga mos. Faqat sozlangan field nomlarini bering, qolganini SDK qiladi.</p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Xush kelibsiz</div>
                  <p className="card-desc" style={{ margin: 0 }}>{user.email}</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={logout}>Chiqish</button>
              </div>
            </section>

            <section className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Yangi API key</div>
                  <p className="card-desc" style={{ margin: 0 }}>Asl key faqat bir marta ko&apos;rsatiladi va tiklab bo&apos;lmaydi.</p>
                </div>
              </div>

              <div className="form-row">
                <label className="block" style={{ marginBottom: 0 }}>
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
                  {apiKeyLoading ? 'Yaratilmoqda...' : 'Yaratish'}
                </button>
              </div>

              {freshApiKey && (
                <div className="secret-box">
                  <div className="secret-label">Yangi API key — faqat bir marta nusxa oling</div>
                  <div className="secret-value">{freshApiKey}</div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={copyApiKey}
                    style={{ marginTop: '0.75rem' }}
                  >
                    {copied ? 'Nusxa olindi!' : 'Nusxa olish'}
                  </button>
                </div>
              )}

              {error && (
                <div className="alert alert-error mt-1">
                  <span className="alert-icon">!</span>
                  <div>{error}</div>
                </div>
              )}
            </section>

            {freshApiKey && (
              <section className="card" style={{ marginBottom: '1.25rem' }}>
                <div className="card-title">Integratsiya qilish</div>
                <p className="card-desc">
                  Quyidagi template&apos;lardan birini loyihangizga nusxa oling.
                  SDK avtomatik shifrlaydi va ochadi.
                </p>
                <CodeTemplates
                  serverUrl={
                    typeof window !== 'undefined'
                      ? window.location.origin
                      : 'https://mrcipher.vercel.app'
                  }
                  apiKey={freshApiKey}
                />
              </section>
            )}

            <section className="card">
              <div className="card-title">Saqlangan API keylar</div>
              <p className="card-desc">Faqat nom va oxirgi 4 ta belgi ko&apos;rsatiladi.</p>

              {apiKeys.length === 0 ? (
                <div className="key-empty">
                  <div className="key-empty-icon"><span>&#128273;</span></div>
                  <div>Hali API key yaratilmagan</div>
                </div>
              ) : (
                <div className="key-list">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="key-item">
                      <div className="key-info">
                        <div className="key-name">{key.name}</div>
                        <div className="key-meta">
                          <span className="key-prefix">mr_····{key.prefix}</span>
                          <span className="key-date">{new Date(key.created_at).toLocaleDateString('uz-UZ')}</span>
                        </div>
                      </div>
                      {key.revoked && <span className="key-badge revoked">Bekor qilingan</span>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card" style={{ marginTop: '1.25rem' }}>
              <div className="card-title">Endpointlar</div>
              <p className="card-desc">So&apos;rovlarda quyidagi sarlavha bo&apos;lishi shart.</p>
              <pre className="code-block">{`Authorization: Bearer <apiKey>`}</pre>
              <div className="grid-2 mt-1">
                <div className="feature-card">
                  <div className="feature-title text-primary">POST /api/v1/encrypt</div>
                  <p className="feature-desc">JSON ma&apos;lumotni shifrlaydi va ciphertext qaytaradi.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-title text-primary">POST /api/v1/decrypt</div>
                  <p className="feature-desc">Ciphertext ni ochib, asl JSON ma&apos;lumotni qaytaradi.</p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <p className="text-muted">MRcipher — AES-256-GCM Encryption-as-a-Service</p>
      </footer>
    </div>
  );
}
