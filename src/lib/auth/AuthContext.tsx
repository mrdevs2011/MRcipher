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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { getAuthInstance } from '../firebaseClient';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  signInError: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshIdToken: () => Promise<string | null>;
  clearSignInError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Firebase'ning email/parol xatolik kodlarini foydalanuvchiga tushunarli
 * o'zbekcha xabarlarga aylantiradi.
 */
function friendlyAuthError(err: any): string {
  const code = err?.code as string | undefined;
  switch (code) {
    case 'auth/invalid-email':
      return "Email manzili noto'g'ri formatda.";
    case 'auth/user-disabled':
      return 'Bu hisob bloklangan.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return "Email yoki parol noto'g'ri.";
    case 'auth/email-already-in-use':
      return "Bu email bilan hisob allaqachon mavjud. \"Kirish\" bo'limidan foydalaning.";
    case 'auth/weak-password':
      return 'Parol juda oddiy. Kamida 6 ta belgidan foydalaning.';
    case 'auth/too-many-requests':
      return "Juda ko'p urinish. Biroz kutib, qayta urinib ko'ring.";
    case 'auth/network-request-failed':
      return 'Tarmoq xatosi. Internet aloqangizni tekshiring.';
    default:
      return err?.message || "Noma'lum xatolik yuz berdi.";
  }
}

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

  async function signInWithEmail(email: string, password: string): Promise<void> {
    setSignInError(null);
    try {
      await signInWithEmailAndPassword(getAuthInstance(), email, password);
    } catch (err: any) {
      setSignInError(friendlyAuthError(err));
      throw err;
    }
  }

  async function signUpWithEmail(email: string, password: string): Promise<void> {
    setSignInError(null);
    try {
      await createUserWithEmailAndPassword(getAuthInstance(), email, password);
    } catch (err: any) {
      setSignInError(friendlyAuthError(err));
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
    signInWithEmail,
    signUpWithEmail,
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
