'use client';

/**
 * UserContext is now a thin wrapper around AuthContext.
 * It was previously backed by mockUsers.ts (fake multi-user switching).
 * Now it reads from Firebase Auth so it reflects the real logged-in user.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UserContextValue {
  isAdmin:       boolean;
  canWrite:      boolean;
  hasPermission: (perm: string) => boolean;
}

const UserContext = createContext<UserContextValue>({
  isAdmin: false,
  canWrite: false,
  hasPermission: () => false,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const { isAdmin, approvalStatus } = useAuth();
  const canWrite = isAdmin || approvalStatus === 'approved';

  return (
    <UserContext.Provider value={{
      isAdmin,
      canWrite,
      hasPermission: (perm: string) => {
        if (isAdmin) return true;
        if (perm === 'read') return canWrite;
        if (perm === 'write') return canWrite;
        return false;
      },
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  return useContext(UserContext);
}
