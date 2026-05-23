'use client';

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import {
  MOCK_USERS, DEMO_ACCOUNTS, ROLE_PERMISSIONS,
  type MockUser, type UserRole,
} from '@/lib/mockUsers';
import { setUserDataPrefix, incrementUserVersion } from '@/lib/dataEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserContextValue {
  currentUser:  MockUser;
  allUsers:     MockUser[];
  demoAccounts: MockUser[];
  switchUser:   (id: string) => void;
  isAdmin:      boolean;
  canWrite:     boolean;
  hasPermission:(perm: string) => boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue | null>(null);
const STORAGE_KEY = 'sg-active-user';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'super_admin';
    return localStorage.getItem(STORAGE_KEY) ?? 'super_admin';
  });

  const currentUser = MOCK_USERS.find(u => u.id === userId) ?? MOCK_USERS[0];

  // Apply data prefix immediately on mount and whenever user changes
  useEffect(() => {
    setUserDataPrefix(currentUser.dataPrefix);
  }, [currentUser.dataPrefix]);

  const switchUser = useCallback((id: string) => {
    const user = MOCK_USERS.find(u => u.id === id);
    if (!user) return;
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* noop */ }
    setUserDataPrefix(user.dataPrefix);
    incrementUserVersion();  // triggers re-render of all data hooks
    setUserId(id);
  }, []);

  const isAdmin  = currentUser.role === 'super_admin';
  const canWrite = (['super_admin', 'org_admin', 'operator'] as UserRole[]).includes(currentUser.role);

  const hasPermission = useCallback((perm: string) => {
    return ROLE_PERMISSIONS[currentUser.role]?.includes(perm) ?? false;
  }, [currentUser.role]);

  return (
    <UserContext.Provider value={{
      currentUser, allUsers: MOCK_USERS, demoAccounts: DEMO_ACCOUNTS,
      switchUser, isAdmin, canWrite, hasPermission,
    }}>
      {children}
    </UserContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
