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
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const app = (await import('@/config/firebase')).default;
      unsubscribe = onAuthStateChanged(getAuth(app), (firebaseUser) => {
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
