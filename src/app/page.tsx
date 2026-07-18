'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Logo } from '@/components/Logo';
import { CodeTemplates } from '@/components/CodeTemplates';
import { ApiKeyPublicView } from '@/lib/types';

export default function HomePage() {
  const { user, loading, signInWithGoogle, logout, refreshIdToken, signInError, clearSignInError } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyPublicView[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyOrigins, setNewKeyOrigins] = useState('');
  const [newKeyIps, setNewKeyIps] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<Record<string, boolean>>({});
  const [freshApiKey, setFreshApiKey] = useState('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrigins, setEditOrigins] = useState('');
  const [editIps, setEditIps] = useState('');
  const [editScopes, setEditScopes] = useState<Record<string, boolean>>({});

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
        setError(json.error?.message || "API keylar ro'yxatini yuklashda xatolik");
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

  function openCreateModal() {
    setShowCreateModal(true);
    setShowAdvanced(false);
    setNewKeyName('');
    setNewKeyOrigins('');
    setNewKeyIps('');
    setNewKeyScopes({});
    setFreshApiKey('');
    setError('');
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setShowAdvanced(false);
  }

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

      const allowedOrigins = newKeyOrigins
        .split(/\n|,/)
        .map((o) => o.trim())
        .filter(Boolean);
      const allowedIps = newKeyIps
        .split(/\n|,/)
        .map((ip) => ip.trim())
        .filter(Boolean);
      const scopes = Object.entries(newKeyScopes)
        .filter(([, checked]) => checked)
        .map(([scope]) => scope);

      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        body: JSON.stringify({
          name: newKeyName.trim() || 'Nomsiz kalit',
          allowed_origins: allowedOrigins.length > 0 ? allowedOrigins : undefined,
          allowed_ips: allowedIps.length > 0 ? allowedIps : undefined,
          scopes: scopes.length > 0 ? scopes : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || 'API key yaratishda xatolik');
        setApiKeyLoading(false);
        return;
      }

      setFreshApiKey(json.data.apiKey);
      setNewKeyName('');
      setNewKeyOrigins('');
      setNewKeyIps('');
      setNewKeyScopes({});
      await loadApiKeys();
    } catch (err) {
      setError('Tarmoq xatosi: API key yaratilmadi');
    } finally {
      setApiKeyLoading(false);
    }
  }

  async function revokeKey(id: string) {
    setApiKeyLoading(true);
    setError('');
    try {
      const freshToken = await refreshIdToken();
      if (!freshToken) {
        setError('ID token topilmadi, qayta kiring.');
        return;
      }

      const res = await fetch(`/api/v1/keys?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${freshToken}`,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "API keyni o'chirishda xatolik");
        return;
      }
      await loadApiKeys();
    } catch (err) {
      setError('Tarmoq xatosi: API keyni o\'chirishda xatolik');
    } finally {
      setApiKeyLoading(false);
    }
  }

  function startEdit(key: ApiKeyPublicView) {
    setEditingKey(key.id);
    setEditName(key.name);
    setEditOrigins((key.allowed_origins ?? []).join('\n'));
    setEditIps((key.allowed_ips ?? []).join('\n'));
    const scopeMap: Record<string, boolean> = {};
    (key.scopes ?? []).forEach((scope) => { scopeMap[scope] = true; });
    setEditScopes(scopeMap);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditName('');
    setEditOrigins('');
    setEditIps('');
    setEditScopes({});
  }

  async function saveEdit(id: string) {
    setApiKeyLoading(true);
    setError('');
    try {
      const freshToken = await refreshIdToken();
      if (!freshToken) {
        setError('ID token topilmadi, qayta kiring.');
        return;
      }

      const allowedOrigins = editOrigins
        .split(/\n|,/)
        .map((o) => o.trim())
        .filter(Boolean);
      const allowedIps = editIps
        .split(/\n|,/)
        .map((ip) => ip.trim())
        .filter(Boolean);
      const scopes = Object.entries(editScopes)
        .filter(([, checked]) => checked)
        .map(([scope]) => scope);

      const res = await fetch(`/api/v1/keys?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        body: JSON.stringify({
          name: editName.trim(),
          allowed_origins: allowedOrigins,
          allowed_ips: allowedIps.length > 0 ? allowedIps : undefined,
          scopes: scopes.length > 0 ? scopes : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || 'API keyni yangilashda xatolik');
        return;
      }

      setEditingKey(null);
      setEditName('');
      setEditOrigins('');
      setEditIps('');
      setEditScopes({});
      await loadApiKeys();
    } catch (err) {
      setError('Tarmoq xatosi: API keyni yangilashda xatolik');
    } finally {
      setApiKeyLoading(false);
    }
  }

  const SCOPE_OPTIONS = ['encrypt', 'decrypt', 'health', 'usage'] as const;

  function toggleScope(
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    scope: string,
  ) {
    setter((prev) => ({ ...prev, [scope]: !prev[scope] }));
  }

  function renderScopeCheckboxes(
    values: Record<string, boolean>,
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    disabled?: boolean,
  ) {
    return (
      <div className="scope-group">
        {SCOPE_OPTIONS.map((scope) => (
          <label key={scope} className="scope-checkbox">
            <input
              type="checkbox"
              checked={!!values[scope]}
              onChange={() => toggleScope(setter, scope)}
              disabled={disabled}
            />
            <span>{scope}</span>
          </label>
        ))}
      </div>
    );
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
                  <div className="card-title">API keylar</div>
                  <p className="card-desc" style={{ margin: 0 }}>
                    Yangi kalit faqat bir marta ko&apos;rsatiladi va tiklab bo&apos;lmaydi.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal} disabled={apiKeyLoading}>
                  API key yaratish
                </button>
              </div>

              {apiKeys.length === 0 ? (
                <div className="key-empty">
                  <div className="key-empty-icon"><span>&#128273;</span></div>
                  <div>Hali API key yaratilmagan</div>
                </div>
              ) : (
                <div className="key-list">
                  {apiKeys.map((key) => (
                    <div key={key.id} className={`key-item ${key.revoked ? 'key-item-revoked' : ''}`}>
                      <div className="key-info">
                        {editingKey === key.id ? (
                          <>
                            <input
                              type="text"
                              className="input input-sm"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              maxLength={100}
                              style={{ marginBottom: '0.5rem' }}
                            />
                            <textarea
                              className="textarea textarea-sm"
                              rows={2}
                              value={editOrigins}
                              onChange={(e) => setEditOrigins(e.target.value)}
                              placeholder="https://example.com"
                              style={{ marginBottom: '0.5rem' }}
                            />
                            <textarea
                              className="textarea textarea-sm"
                              rows={2}
                              value={editIps}
                              onChange={(e) => setEditIps(e.target.value)}
                              placeholder="192.168.1.10"
                              style={{ marginBottom: '0.5rem' }}
                            />
                            {renderScopeCheckboxes(editScopes, setEditScopes)}
                          </>
                        ) : (
                          <>
                            <div className="key-name">{key.name}</div>
                            <div className="key-meta">
                              <span className="key-prefix">mr_····{key.prefix}</span>
                              <span className="key-date">{new Date(key.created_at).toLocaleDateString('uz-UZ')}</span>
                              {key.last_used_at && (
                                <span className="key-date">Oxirgi ishlatilgan: {new Date(key.last_used_at).toLocaleDateString('uz-UZ')}</span>
                              )}
                              {key.scopes && key.scopes.length > 0 && (
                                <span className="key-date">Scopes: {key.scopes.join(', ')}</span>
                              )}
                            </div>
                            {key.allowed_origins && key.allowed_origins.length > 0 && (
                              <div className="key-origins">
                                {key.allowed_origins.join(', ')}
                              </div>
                            )}
                            {key.allowed_ips && key.allowed_ips.length > 0 && (
                              <div className="key-origins">
                                IPs: {key.allowed_ips.join(', ')}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="key-actions">
                        {key.revoked ? (
                          <span className="key-badge revoked">Bekor qilingan</span>
                        ) : editingKey === key.id ? (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Bekor</button>
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(key.id)} disabled={apiKeyLoading}>Saqlash</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(key)}>Tahrirlash</button>
                            <button className="btn btn-danger btn-sm" onClick={() => revokeKey(key.id)} disabled={apiKeyLoading}>O&apos;chirish</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {showCreateModal && (
              <div className="modal-overlay" onClick={closeCreateModal}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div className="card-title">Yangi API key yaratish</div>
                    <button className="btn btn-ghost btn-sm" onClick={closeCreateModal}>×</button>
                  </div>

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
                    className="btn btn-ghost btn-sm advanced-toggle"
                    onClick={() => setShowAdvanced((prev) => !prev)}
                    type="button"
                  >
                    {showAdvanced ? '▼ Advanced sozlamalarni yashirish' : '▶ Advanced sozlamalar'}
                  </button>

                  {showAdvanced && (
                    <div className="advanced-fields">
                      <label className="block mt-1" style={{ marginBottom: 0 }}>
                        Ruxsat etilgan domenlar (ixtiyoriy)
                        <textarea
                          className="textarea"
                          rows={2}
                          value={newKeyOrigins}
                          onChange={(e) => setNewKeyOrigins(e.target.value)}
                          placeholder="https://example.com&#10;https://app.example.com"
                        />
                        <span className="input-hint">
                          Bo&apos;sh qoldirilsa barcha domenlarga ruxsat. Har bir qatorda bitta domen.
                        </span>
                      </label>

                      <label className="block mt-1" style={{ marginBottom: 0 }}>
                        Ruxsat etilgan IP manzillar (ixtiyoriy)
                        <textarea
                          className="textarea"
                          rows={2}
                          value={newKeyIps}
                          onChange={(e) => setNewKeyIps(e.target.value)}
                          placeholder="192.168.1.10&#10;10.0.0.0/24"
                        />
                        <span className="input-hint">
                          Bo&apos;sh qoldirilsa barcha IP larga ruxsat. Har bir qatorda bitta IP yoki CIDR.
                        </span>
                      </label>

                      <label className="block mt-1" style={{ marginBottom: 0 }}>
                        Ruxsat etilgan endpointlar (ixtiyoriy)
                        {renderScopeCheckboxes(newKeyScopes, setNewKeyScopes)}
                        <span className="input-hint">
                          Hech biri tanlanmasa barcha endpointlarga ruxsat.
                        </span>
                      </label>
                    </div>
                  )}

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

                  <div className="modal-actions">
                    <button className="btn btn-ghost" onClick={closeCreateModal}>Bekor qilish</button>
                    <button
                      className="btn btn-primary"
                      onClick={createApiKey}
                      disabled={apiKeyLoading}
                    >
                      {apiKeyLoading ? 'Yaratilmoqda...' : 'Yaratish'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {freshApiKey && !showCreateModal && (
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
              <div className="grid-2 mt-1">
                <div className="feature-card">
                  <div className="feature-title text-primary">GET /api/v1/health</div>
                  <p className="feature-desc">API key va Firestore holatini tekshiradi.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-title text-primary">GET /api/v1/usage</div>
                  <p className="feature-desc">Foydalanish statistikasi: shifrlash/ochish soni.</p>
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
