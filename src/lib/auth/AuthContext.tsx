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
import { auth, googleProvider } from '../firebaseClient';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshIdToken(): Promise<string | null> {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken(true);
    setIdToken(token);
    return token;
  }

  async function signInWithGoogle(): Promise<void> {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      const token = await result.user.getIdToken();
      setIdToken(token);
    }
  }

  async function logout(): Promise<void> {
    await signOut(auth);
    setIdToken(null);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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
    signInWithGoogle,
    logout,
    refreshIdToken,
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
