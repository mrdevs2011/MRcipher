'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Logo } from '@/components/Logo';

/**
 * /cli-auth — mrcipher-cli uchun brauzer orqali login sahifasi.
 *
 * `mrcipher login` buyrug'i quyidagicha ishlaydi:
 *   1. CLI localhost'da vaqtinchalik HTTP server ochadi (masalan port 51823).
 *   2. CLI shu sahifani ochadi: /cli-auth?port=51823&session=<random>
 *   3. Foydalanuvchi shu yerda (xuddi saytdagidek) Google bilan kiradi.
 *   4. Login muvaffaqiyatli bo'lgach, sahifa /api/v1/keys orqali "CLI" nomli
 *      yangi API key yaratadi va uni faqat localhost'dagi CLI serveriga
 *      (http://127.0.0.1:<port>/callback) yuboradi — boshqa hech qayerga emas.
 *   5. CLI tokenni oladi, diskka saqlaydi, bu sahifa "Terminalga qayting"
 *      degan xabar ko'rsatadi.
 */

type Status =
  | 'idle'
  | 'confirm_account'
  | 'signing_in'
  | 'creating_key'
  | 'sending_to_cli'
  | 'success'
  | 'error';

function CliAuthInner() {
  const params = useSearchParams();
  const port = params.get('port');
  const session = params.get('session');
  const deviceLabel = params.get('device') || '';
  // mode=key   (default): mint a persistent CLI API key (used by `mrcipher login`)
  // mode=token: just hand back a fresh Firebase ID token for one action
  //             (used by `mrcipher keys list/create/revoke`, since /api/v1/keys
  //             is owner-auth only and doesn't accept the saved API key)
  const mode = params.get('mode') === 'token' ? 'token' : 'key';

  const { user, loading, signInWithGoogle, logout, refreshIdToken, signInError } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  // true faqat foydalanuvchi shu sahifada "Google bilan kirish" tugmasini
  // bosib, sign-in oqimini hozir, aniq ravishda o'zi boshlagan bo'lsa.
  // false bo'lsa — bu sahifa ochilganda brauzerda AVVALDAN saqlangan
  // sessiya borligini bildiradi, va bunday holatda avtomatik davom
  // etmasdan, foydalanuvchidan tasdiq so'raymiz.
  const justSignedInRef = useRef(false);

  const invalidRequest = !port || !/^\d{2,5}$/.test(port);

  const completeHandoff = useCallback(async () => {
    if (invalidRequest) return;

    try {
      const idToken = await refreshIdToken();
      if (!idToken) {
        throw new Error('Google login tokeni topilmadi. Qayta urinib ko\'ring.');
      }

      let payload: Record<string, unknown>;

      if (mode === 'token') {
        // Bir martalik harakat (masalan `mrcipher keys list`) uchun faqat
        // yangi Firebase ID token kerak — yangi API key yaratilmaydi.
        payload = {
          session,
          idToken,
          email: user?.email ?? null,
          baseUrl: window.location.origin,
        };
      } else {
        setStatus('creating_key');
        const keyName = `CLI${deviceLabel ? ` - ${deviceLabel}` : ''} - ${new Date()
          .toISOString()
          .slice(0, 16)
          .replace('T', ' ')}`;

        const createRes = await fetch('/api/v1/keys', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${idToken}`,
            origin: window.location.origin,
          },
          body: JSON.stringify({
            name: keyName,
            scopes: ['encrypt', 'decrypt', 'health', 'usage'],
          }),
        });

        const createJson = await createRes.json();
        if (!createRes.ok || !createJson.success) {
          throw new Error(
            createJson.error?.message || "CLI uchun API key yaratib bo'lmadi",
          );
        }

        payload = {
          session,
          apiKey: createJson.data.apiKey as string,
          keyId: createJson.data.key.id as string,
          email: user?.email ?? null,
          baseUrl: window.location.origin,
        };
      }

      setStatus('sending_to_cli');

      const callbackRes = await fetch(`http://127.0.0.1:${port}/callback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!callbackRes.ok) {
        throw new Error(
          "CLI bilan bog'lanib bo'lmadi. Terminal ochiq va `mrcipher` buyrug'i kutayotganiga ishonch hosil qiling.",
        );
      }

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Nomaʼlum xatolik yuz berdi.');
    }
  }, [invalidRequest, port, session, deviceLabel, mode, refreshIdToken, user]);

  useEffect(() => {
    if (loading || invalidRequest || !user) return;

    if (justSignedInRef.current) {
      // Foydalanuvchi shu yerda, hozir, aniq ravishda kirdi — qo'shimcha
      // tasdiqsiz davom etamiz. Statusga qaramaymiz: handleSignIn() allaqachon
      // uni 'signing_in'ga o'zgartirgan va u endi hech qachon 'idle'ga
      // qaytmaydi, shuning uchun `status === 'idle'` sharti bu yerda noto'g'ri.
      justSignedInRef.current = false;
      void completeHandoff();
      return;
    }

    if (status === 'idle') {
      // Brauzerda avvaldan saqlangan sessiya bor edi. Jimgina o'sha
      // hisobga o'tib ketmasdan, avval tasdiq so'raymiz.
      setStatus('confirm_account');
    }
  }, [loading, user, status, invalidRequest, completeHandoff]);

  async function handleSignIn() {
    setError('');
    justSignedInRef.current = true;
    setStatus('signing_in');
    try {
      await signInWithGoogle();
      // onAuthStateChanged -> user o'rnatiladi -> yuqoridagi useEffect handoff'ni davom ettiradi.
    } catch {
      justSignedInRef.current = false;
      setStatus('idle');
    }
  }

  function handleContinueWithCurrentAccount() {
    void completeHandoff();
  }

  async function handleSwitchAccount() {
    setError('');
    setStatus('signing_in');
    try {
      // Avval to'liq chiqamiz, so'ng hisob tanlash oynasi bilan qaytadan
      // kiramiz — shunda foydalanuvchi boshqa Google hisobini tanlay oladi.
      await logout();
      justSignedInRef.current = true;
      await signInWithGoogle();
    } catch {
      justSignedInRef.current = false;
      setStatus('idle');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <Logo size={48} />
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
          MRcipher CLI login
        </h1>

        {invalidRequest && (
          <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>
            Noto&apos;g&apos;ri so&apos;rov: <code>port</code> parametri yo&apos;q yoki xato. Iltimos,
            sahifani <code>mrcipher login</code> orqali oching.
          </p>
        )}

        {!invalidRequest && status === 'confirm_account' && (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
              Bu brauzerda allaqachon quyidagi hisob bilan kirilgan:
            </p>
            <p style={{ color: 'var(--text)', fontWeight: 600, margin: '0 0 1.5rem' }}>
              {user?.email}
            </p>

            {signInError && (
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {signInError}
              </p>
            )}

            <button
              onClick={handleContinueWithCurrentAccount}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hover)',
                background: 'var(--bg-input)',
                color: 'var(--text)',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '0.75rem',
              }}
            >
              Shu hisob bilan CLI ni ulash
            </button>
            <button
              onClick={handleSwitchAccount}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hover)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Boshqa hisobga o&apos;tish (chiqish va qayta kirish)
            </button>
          </>
        )}

        {!invalidRequest && status !== 'success' && status !== 'error' && status !== 'confirm_account' && (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
              Terminaldagi <code>mrcipher</code> CLI ni ushbu hisobingizga ulash
              uchun Google bilan kiring.
            </p>

            {signInError && (
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {signInError}
              </p>
            )}

            {status === 'idle' && !loading && (
              <button
                onClick={handleSignIn}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hover)',
                  background: 'var(--bg-input)',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Google bilan kirish
              </button>
            )}

            {(loading ||
              status === 'signing_in' ||
              status === 'creating_key' ||
              status === 'sending_to_cli') && (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                {status === 'creating_key' && "API key yaratilmoqda…"}
                {status === 'sending_to_cli' && "Terminalga uzatilmoqda…"}
                {(loading || status === 'signing_in') && 'Yuklanmoqda…'}
              </p>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ color: 'var(--success)', fontSize: '2rem', marginBottom: '0.5rem' }}>
              ✓
            </div>
            <p style={{ color: 'var(--text)', fontWeight: 600, margin: '0 0 0.25rem' }}>
              Muvaffaqiyatli ulandi!
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Endi bu oynani yopib, terminalga qaytishingiz mumkin.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ color: 'var(--danger)', fontSize: '2rem', marginBottom: '0.5rem' }}>
              ✕
            </div>
            <p style={{ color: 'var(--danger)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
              {error}
            </p>
            <button
              onClick={() => {
                setStatus('idle');
                setError('');
              }}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hover)',
                background: 'var(--bg-input)',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              Qayta urinish
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function CliAuthPage() {
  return (
    <Suspense fallback={null}>
      <CliAuthInner />
    </Suspense>
  );
}
