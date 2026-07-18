'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { getAuthInstance, googleProvider } from '../firebaseClient';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  signInError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshIdToken: () => Promise<string | null>;
  clearSignInError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signInError, setSignInError] = useState<string | null>(null);

  async function refreshIdToken(): Promise<string | null> {
    const currentUser = getAuthInstance().currentUser;
    if (!currentUser) return null;
    const token = await currentUser.getIdToken(true);
    setIdToken(token);
    return token;
  }

  async function signInWithGoogle(): Promise<void> {
    setSignInError(null);
    try {
      const result = await signInWithPopup(getAuthInstance(), googleProvider);
      if (result.user) {
        const token = await result.user.getIdToken();
        setIdToken(token);
      }
    } catch (err: any) {
      // Brauzer popup ni bloklaganda DOMException "Blocked" yoki "AbortError" beradi.
      const isPopupBlocked =
        err?.name === 'Blocked' ||
        err?.message?.toLowerCase().includes('popup');

      if (isPopupBlocked) {
        setSignInError(
          'Brauzer Google oynasini (popup) blokladi. Iltimos, saytga popup ochish ruxsatini bering va qayta urinib ko\'ring.',
        );
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setSignInError('Kirish oynasi yopildi. Qayta urinib ko\'ring.');
      } else if (err?.code === 'auth/cancelled-popup-request') {
        // Bir nechta parallel popup so'rov — e'tiborsiz.
        return;
      } else {
        setSignInError(
          err?.message || 'Google bilan kirishda noma\'lum xatolik yuz berdi.',
        );
      }
      throw err;
    }
  }

  function clearSignInError() {
    setSignInError(null);
  }

  async function logout(): Promise<void> {
    await signOut(getAuthInstance());
    setIdToken(null);
    setSignInError(null);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuthInstance(), async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await currentUser.getIdToken();
        setIdToken(token);
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    idToken,
    signInError,
    signInWithGoogle,
    logout,
    refreshIdToken,
    clearSignInError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
