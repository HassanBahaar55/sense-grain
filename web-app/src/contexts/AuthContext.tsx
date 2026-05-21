'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAuth, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import type { User } from 'firebase/auth';
import firebaseApp from '@/config/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  redirectError: string;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, redirectError: '' });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [loading, setLoading]         = useState(true);
  const [redirectError, setRedirectError] = useState('');

  useEffect(() => {
    const auth = getAuth(firebaseApp);

    // Set up auth state listener immediately (no dynamic import delay)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // Process any pending Google redirect result
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('[Auth] Redirect success:', result.user.email);
        }
      })
      .catch((err: unknown) => {
        const code = (err as { code?: string }).code ?? '';
        console.error('[Auth] getRedirectResult error:', code, err);
        if (code === 'auth/unauthorized-domain') {
          setRedirectError('Domain not authorized. Contact support.');
        } else if (code === 'auth/operation-not-allowed') {
          setRedirectError('Google sign-in is not enabled in Firebase.');
        } else if (code) {
          setRedirectError(`Google auth error: ${code}`);
        }
      });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, redirectError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
