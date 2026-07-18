'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Logo } from '@/components/Logo';
import { CodeTemplates } from '@/components/CodeTemplates';
import {
  AlertTriangleIcon,
  ChatIcon,
  CheckIcon,
  CloseIcon,
  ExclamationIcon,
  KeyIcon,
  LockIcon,
  RefreshIcon,
  ZapIcon,
} from '@/components/Icons';
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
  const [freshApiKeyId, setFreshApiKeyId] = useState('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrigins, setEditOrigins] = useState('');
  const [editIps, setEditIps] = useState('');
  const [editScopes, setEditScopes] = useState<Record<string, boolean>>({});

  // Translator state
  const [translatorMode, setTranslatorMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [translatorInput, setTranslatorInput] = useState('');
  const [translatorOutput, setTranslatorOutput] = useState('');
  const [translatorMeta, setTranslatorMeta] = useState<{ latency_ms: number; bytes_in?: number; bytes_out?: number } | null>(null);
  const [translatorLoading, setTranslatorLoading] = useState(false);
  const [translatorBoundKeyId, setTranslatorBoundKeyId] = useState<'fresh' | string>('fresh');
  const [translatorBoundRawKey, setTranslatorBoundRawKey] = useState('');

  useEffect(() => {
    if (freshApiKey && freshApiKeyId) {
      setTranslatorBoundKeyId(freshApiKeyId);
    }
  }, [freshApiKey, freshApiKeyId]);

  useEffect(() => {
    if (translatorBoundKeyId === 'fresh') {
      setTranslatorBoundRawKey(freshApiKey || '');
      return;
    }
    const selected = apiKeys.find((key) => key.id === translatorBoundKeyId);
    setTranslatorBoundRawKey(selected?.raw_key || '');
  }, [translatorBoundKeyId, apiKeys, freshApiKey]);

  async function saveUserPreferenceState(keyId: 'fresh' | string) {
    if (!user) return;
    try {
      const freshToken = await refreshIdToken();
      if (!freshToken) return;

      await fetch('/api/v1/preferences', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        body: JSON.stringify({ selected_api_key_id: keyId }),
      });
    } catch {
      // Preferensiyani saqlash muvaffaqiyatsiz bo‘lsa UI bloklanmasin.
    }
  }

  function handleKeySelect(keyId: 'fresh' | string) {
    setTranslatorBoundKeyId(keyId);
    setError('');
    void saveUserPreferenceState(keyId);
  }

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

      const keys = (json.data.keys ?? []) as ApiKeyPublicView[];
      setApiKeys(keys);

      // Firebase'da saqlangan translator keyini yuklab, topilmasa birinchi keyga tushamiz.
      try {
        const prefRes = await fetch('/api/v1/preferences', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${freshToken}`,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
          },
        });
        if (prefRes.ok) {
          const prefJson = await prefRes.json();
          const savedId = prefJson.data?.preference?.selected_api_key_id as string | undefined;
          const firstKey = keys.find((k) => !k.revoked);
          let resolved: 'fresh' | string = firstKey?.id ?? 'fresh';
          if (savedId === 'fresh') {
            resolved = freshApiKey ? 'fresh' : (firstKey?.id ?? 'fresh');
          } else if (savedId && keys.some((k) => k.id === savedId && !k.revoked)) {
            resolved = savedId;
          }
          setTranslatorBoundKeyId(resolved);
        }
      } catch {
        // Preferensiyani yuklashda xatolik bo‘lsa faqat keylar ro‘yxati ko‘rsatiladi.
      }
    } catch (err) {
      setError('Tarmoq xatosi: API keylar ro\'yxati yuklanmadi');
    }
  }, [refreshIdToken, freshApiKey]);

  useEffect(() => {
    if (user) {
      loadApiKeys();
    } else {
      // Logout bo‘lganda state tozalanadi, keyingi foydalanuvchi eski ma’lumotlarni ko‘rmaydi.
      setApiKeys([]);
      setFreshApiKey('');
      setFreshApiKeyId('');
      setTranslatorBoundKeyId('fresh');
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
    setFreshApiKeyId('');
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

      const createdKeyId = json.data.key?.id as string | undefined;
      const createdRawKey = json.data.apiKey as string | undefined;
      if (createdRawKey) setFreshApiKey(createdRawKey);
      if (createdKeyId) setFreshApiKeyId(createdKeyId);
      setNewKeyName('');
      setNewKeyOrigins('');
      setNewKeyIps('');
      setNewKeyScopes({});
      await loadApiKeys();
      if (createdKeyId) {
        setTranslatorBoundKeyId(createdKeyId);
        void saveUserPreferenceState(createdKeyId);
      }
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

  async function runTranslator() {
    if (!translatorInput.trim()) return;

    const keyToUse = translatorBoundRawKey;
    if (!keyToUse) {
      setError('Translator uchun yaratilgan API keylardan birini tanlang.');
      return;
    }

    setTranslatorLoading(true);
    setError('');
    setTranslatorMeta(null);

    const start = performance.now();
    try {
      if (translatorMode === 'encrypt') {
        const res = await fetch('/api/v1/encrypt', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${keyToUse}`,
          },
          body: JSON.stringify({ content: translatorInput }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Shifrlashda xatolik');
        }
        setTranslatorOutput(JSON.stringify(json.data, null, 2));
        setTranslatorMeta({
          latency_ms: Math.round(performance.now() - start),
          bytes_in: json.meta?.bytes_in,
          bytes_out: json.meta?.bytes_out,
        });
      } else {
        let payload;
        try {
          payload = JSON.parse(translatorInput);
        } catch {
          throw new Error('Input to‘g‘ri JSON emas. Avval shifrlangan payload kiriting.');
        }
        const res = await fetch('/api/v1/decrypt', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${keyToUse}`,
          },
          body: JSON.stringify({ content: payload }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Ochishda xatolik');
        }
        setTranslatorOutput(typeof json.data === 'string' ? json.data : JSON.stringify(json.data, null, 2));
        setTranslatorMeta({
          latency_ms: Math.round(performance.now() - start),
          bytes_in: json.meta?.bytes_in,
          bytes_out: json.meta?.bytes_out,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tarmoq xatosi');
    } finally {
      setTranslatorLoading(false);
    }
  }

  function swapTranslator() {
    setTranslatorMode((prev) => (prev === 'encrypt' ? 'decrypt' : 'encrypt'));
    setTranslatorInput(translatorOutput);
    setTranslatorOutput('');
    setTranslatorMeta(null);
  }

  function copyTranslatorOutput() {
    if (!translatorOutput) return;
    navigator.clipboard.writeText(translatorOutput).then(() => {
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
    <div className="page">
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

      <main>
        <div className="container">
        {!user ? (
          <section className="hero">
            <div className="badge">
              <span className="badge-dot" />
              AES-256-GCM Encryption-as-a-Service
            </div>

            <Logo size={80} />
            <h1 className='mt-2'>
              Himoyalang<span>.</span> Har qanday ma&apos;lumot.
            </h1>
            <p>
              MRcipher serverlaringiz va ma&apos;lumotlaringiz o&apos;rtasida shifrlash
              qatlami bo&apos;lib xizmat qiladi. Bir marta ulang, qolganini biz hal
              qilamiz.
            </p>

            {signInError && (
              <div className="alert alert-error alert-inline">
                <span className="alert-icon"><ExclamationIcon size={20} /></span>
                <div className="alert-body">
                  {signInError}
                  <button className="btn btn-ghost btn-sm" onClick={clearSignInError}>
                    Yopish
                  </button>
                </div>
              </div>
            )}

            <div className="hero-actions">
              <button className="btn btn-primary" onClick={signInWithGoogle}>
                Google bilan boshlash
              </button>
            </div>

            <div className="grid-3 mt-2">
              <div className="feature-card">
                <div className="feature-icon"><LockIcon size={28} /></div>
                <div className="feature-title">AES-256-GCM</div>
                <p className="feature-desc">Zamonaviy autentifikatsiyalik shifrlash. Har bir foydalanuvchi o&apos;z kalitiga ega.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><ZapIcon size={28} /></div>
                <div className="feature-title">Drop-in SDK</div>
                <p className="feature-desc">Bir necha qatorda ulang. Avtomatik shifrlash va ochish — JavaScript, Python, Go, PHP, Java.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><ChatIcon size={28} /></div>
                <div className="feature-title">API-first</div>
                <p className="feature-desc">Har qanday backendga mos. Faqat sozlangan field nomlarini bering, qolganini SDK qiladi.</p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className='card mb-1'>
              <div className="card-header">
                <div>
                  <div className="card-title">Xush kelibsiz</div>
                  <p className="card-desc" >{user.email}</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={logout}>Chiqish</button>
              </div>
            </section>

            <section className='card mb-1'>
              <div className="card-header translator-header">
                <div>
                  <div className="card-title">Cipher Translator</div>
                  <p className="card-desc" >
                    Google Translate kabi: matnni shifrlang yoki shifrlangan payload ni oching.
                  </p>
                </div>
                <div className="tab-list">
                  <button
                    className={`tab ${translatorMode === 'encrypt' ? 'active' : ''}`}
                    onClick={() => {
                      setTranslatorMode('encrypt');
                      setTranslatorInput(translatorOutput);
                      setTranslatorOutput('');
                      setTranslatorMeta(null);
                    }}
                  >
                    Matn → Cipher
                  </button>
                  <button
                    className={`tab ${translatorMode === 'decrypt' ? 'active' : ''}`}
                    onClick={() => {
                      setTranslatorMode('decrypt');
                      setTranslatorInput(translatorOutput);
                      setTranslatorOutput('');
                      setTranslatorMeta(null);
                    }}
                  >
                    Cipher → Matn
                  </button>
                </div>
              </div>

              <div className='key-selector'>
                <label className='key-selector-field'>
                  API key
                  <select
                    className="input"
                    value={translatorBoundKeyId}
                    onChange={(e) => handleKeySelect(e.target.value)}
                  >
                    <option value="fresh">
                      Yangi yaratilgan key {freshApiKey ? `· mr_···${freshApiKey.slice(-4)}` : '(mavjud emas)'}
                    </option>
                    {apiKeys
                      .filter((key) => !key.revoked)
                      .map((key) => (
                        <option key={key.id} value={key.id}>
                          {key.name} · mr_····{key.prefix}
                        </option>
                      ))}
                  </select>
                </label>


                {!translatorBoundRawKey && translatorBoundKeyId === 'fresh' && (
                  <div className='key-meta key-status'>
                    <span className='status-warning'>
                      <AlertTriangleIcon size={14} /> Yangi key yaratib, uni tanlang
                    </span>
                  </div>
                )}

                {!translatorBoundRawKey && translatorBoundKeyId !== 'fresh' && (
                  <div className='key-meta key-status'>
                    <span className='status-warning'>
                      <AlertTriangleIcon size={14} /> Tanlangan key ma’lumotlari topilmadi
                    </span>
                  </div>
                )}
              </div>

              <div className="translator-grid">
                <div className="translator-col">
                  <label className="block">
                    {translatorMode === 'encrypt' ? 'Matn' : 'Cipher JSON'}
                  </label>
                  <textarea
                    className="textarea"
                    rows={6}
                    value={translatorInput}
                    onChange={(e) => setTranslatorInput(e.target.value)}
                    placeholder={
                      translatorMode === 'encrypt'
                        ? 'Shifrlash uchun matn kiriting...'
                        : '{\n  "ciphertext": "...",\n  "iv": "...",\n  "tag": "...",\n  "version": "v1"\n}'
                    }
                  />
                </div>

                <div className="translator-actions">
                  <button
                    className="btn btn-primary btn-translator-run"
                    onClick={runTranslator}
                    disabled={translatorLoading || !translatorInput.trim()}
                  >
                    {translatorLoading
                      ? 'Yuklanmoqda...'
                      : translatorMode === 'encrypt'
                        ? 'Shifrlash'
                        : 'Ochish'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={swapTranslator} type="button">
                    <RefreshIcon size={14} /> Almashtirish
                  </button>
                </div>

                <div className="translator-col">
                  <label className="block">
                    {translatorMode === 'encrypt' ? 'Cipher JSON' : 'Matn'}
                    <button
                      className='btn btn-ghost btn-sm btn-copy-inline'
                      onClick={copyTranslatorOutput}
                      disabled={!translatorOutput}
                    >
                      {copied ? 'Nusxa olindi!' : 'Nusxa olish'}
                    </button>
                  </label>
                  <textarea
                    className="textarea"
                    rows={6}
                    value={translatorOutput}
                    readOnly
                    placeholder="Natija shu yerda ko'rinadi..."
                  />
                </div>
              </div>

              {translatorMeta && (
                <div className="key-meta" >
                  <span>Latency: {translatorMeta.latency_ms}ms</span>
                  {translatorMeta.bytes_in !== undefined && (
                    <span>Bytes in: {translatorMeta.bytes_in}</span>
                  )}
                  {translatorMeta.bytes_out !== undefined && (
                    <span>Bytes out: {translatorMeta.bytes_out}</span>
                  )}
                </div>
              )}

            </section>

            <section className='card mb-1'>
              <div className="card-header key-card-header">
                <div>
                  <div className="card-title">API keylar</div>
                  <p className="card-desc" >
                    Yangi kalit faqat bir marta ko&apos;rsatiladi va tiklab bo&apos;lmaydi.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal} disabled={apiKeyLoading}>
                  API key yaratish
                </button>
              </div>

              {apiKeys.length === 0 ? (
                <div className="key-empty">
                  <div className="key-empty-icon"><KeyIcon size={40} /></div>
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
                              
                            />
                            <textarea
                              className="textarea textarea-sm"
                              rows={2}
                              value={editOrigins}
                              onChange={(e) => setEditOrigins(e.target.value)}
                              placeholder="https://example.com"
                              
                            />
                            <textarea
                              className="textarea textarea-sm"
                              rows={2}
                              value={editIps}
                              onChange={(e) => setEditIps(e.target.value)}
                              placeholder="192.168.1.10"
                              
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
                    <button className="btn btn-ghost btn-sm" onClick={closeCreateModal}><CloseIcon size={20} /></button>
                  </div>

                  <label className="block" >
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
                      <label className="block mt-1" >
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

                      <label className="block mt-1" >
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

                      <label className="block mt-1" >
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
              <section className='card mb-1'>
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

            <section className='card mt-1'>
              <div className="card-title">Endpointlar</div>
              <p className="card-desc">So&apos;rovlarda quyidagi sarlavha bo&apos;lishi shart.</p>
              <pre className="code-block">{`Authorization: Bearer <apiKey>`}</pre>
              <div className="endpoint-grid mt-1">
                <div className="feature-card">
                  <div className="feature-title text-primary">POST /api/v1/encrypt</div>
                  <p className="feature-desc">JSON ma&apos;lumotni shifrlaydi va ciphertext qaytaradi.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-title text-primary">POST /api/v1/decrypt</div>
                  <p className="feature-desc">Ciphertext ni ochib, asl JSON ma&apos;lumotni qaytaradi.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-title text-primary">GET /api/v1/health</div>
                  <p className="feature-desc">API key va Firestore holatini tekshiradi.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-title text-primary">GET /api/v1/usage</div>
                  <p className="feature-desc">Foydalanish statistikasi: shifrlash/ochish soni.</p>
                </div>
              </div>

              <div className="mt-1 text-center">
                <a href="/doc" className="btn btn-secondary">
                  Dasturchi uchun qo‘llanma
                </a>
              </div>
            </section>
          </>
        )}
        </div>
      </main>

      <footer className="footer">
        <p className="text-muted">MRcipher — AES-256-GCM Encryption-as-a-Service</p>
      </footer>
    </div>
  );
}
