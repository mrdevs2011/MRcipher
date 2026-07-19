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
  signInWithRedirect,
  getRedirectResult,
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
      // MUHIM: popup emas, redirect ishlatamiz. signInWithPopup() Firebase
      // popup oynasi bilan asosiy oyna o'rtasida IndexedDB orqali natija
      // almashishga tayanadi. Firefox'ning Total Cookie Protection (va
      // Safari'ning ITP) xususiyati bu storage'ni saytlar bo'yicha ajratib
      // qo'yadi — natijada Google'da hisob tanlangandan keyin ham promise
      // hech qachon resolve bo'lmaydi va xatolik ham tashlanmaydi (sahifa
      // abadiy "Yuklanmoqda…"da qolib ketadi). Redirect esa shu muammoni
      // butunlay chetlab o'tadi, chunki bir xil oyna/tab ichida navigatsiya
      // qilinadi. Muvaffaqiyat/hatolik natijasi keyingi sahifa yuklanganda
      // getRedirectResult() orqali (pastdagi useEffect) qayta ishlanadi.
      await signInWithRedirect(getAuthInstance(), googleProvider);
      // Odatda bu qatorga hech qachon yetib kelinmaydi — brauzer Google
      // sahifasiga o'tib ketadi.
    } catch (err: any) {
      setSignInError(
        err?.message || 'Google bilan kirishda noma\'lum xatolik yuz berdi.',
      );
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
    // Redirect orqali Google'dan qaytib kelgan bo'lsak, natija (yoki
    // xatolik) shu yerda ushlanadi. onAuthStateChanged pastda baribir
    // yangi userni beradi — bu yerda faqat xatoliklarni ko'rsatamiz.
    getRedirectResult(getAuthInstance()).catch((err: any) => {
      if (err?.code === 'auth/account-exists-with-different-credential') {
        setSignInError(
          "Bu email boshqa kirish usuli bilan bog'langan. Boshqa usulda kiring.",
        );
      } else if (err?.code) {
        setSignInError(
          err?.message || 'Google bilan kirishda noma\'lum xatolik yuz berdi.',
        );
      }
    });

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
