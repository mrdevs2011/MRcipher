'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ExclamationIcon } from '@/components/Icons';

type Mode = 'signin' | 'signup';

/**
 * Email + parol orqali kirish/ro'yxatdan o'tish formasi.
 *
 * Saytda (bosh sahifada, foydalanuvchi kirmagan holatda) va CLI login
 * sahifasida (/cli-auth) bir xil ishlatiladi — CLI ham xuddi shu oynani
 * brauzerda ochadi.
 */
export function AuthForm({ onSuccess }: { onSuccess?: () => void }) {
  const { signInWithEmail, signUpWithEmail, signInError, clearSignInError } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    clearSignInError();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    clearSignInError();
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      onSuccess?.();
    } catch {
      // Xatolik xabari signInError orqali AuthContext'da ko'rsatiladi.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="tab-list auth-form-tabs">
        <button
          type="button"
          className={`tab ${mode === 'signin' ? 'active' : ''}`}
          onClick={() => switchMode('signin')}
        >
          Kirish
        </button>
        <button
          type="button"
          className={`tab ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => switchMode('signup')}
        >
          Ro&apos;yxatdan o&apos;tish
        </button>
      </div>

      <label className="block mt-1">
        Email
        <input
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="siz@example.com"
          autoComplete="email"
          required
        />
      </label>

      <label className="block mt-1">
        Parol
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          minLength={6}
          required
        />
      </label>

      {signInError && (
        <div className="alert alert-error alert-inline mt-1">
          <span className="alert-icon"><ExclamationIcon size={20} /></span>
          <div className="alert-body">
            {signInError}
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearSignInError}>
              Yopish
            </button>
          </div>
        </div>
      )}

      <button type="submit" className="btn btn-primary mt-1 auth-form-submit" disabled={submitting}>
        {submitting
          ? 'Yuklanmoqda...'
          : mode === 'signin'
            ? 'Kirish'
            : "Ro'yxatdan o'tish"}
      </button>
    </form>
  );
}
