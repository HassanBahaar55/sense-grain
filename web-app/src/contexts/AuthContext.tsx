'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      const { getAuth, onAuthStateChanged, getRedirectResult } = await import('firebase/auth');
      const app = (await import('@/config/firebase')).default;
      const auth = getAuth(app);

      // Process any pending Google redirect first — this is required for signInWithRedirect to complete
      try {
        await getRedirectResult(auth);
      } catch (err) {
        console.error('[getRedirectResult error]', err);
      }

      // Now listen — fires immediately with current user (including the one just set by redirect)
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      });
    };

    init();
    return () => unsubscribe?.();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
