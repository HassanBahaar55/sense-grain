import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import firestore from '@react-native-firebase/firestore';

import type {ApprovalStatus, UserProfile} from '../lib/accountDb';
import {useAuth} from '../app/AuthProvider';

// ─── Context type ─────────────────────────────────────────────────────────────

interface UserContextValue {
  profile: UserProfile | null;
  approvalStatus: ApprovalStatus | null;
  isAdmin: boolean;
  loading: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue>({
  profile: null,
  approvalStatus: null,
  isAdmin: false,
  loading: true,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UserProvider({children}: {children: React.ReactNode}) {
  const {user} = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = firestore()
      .doc(`users/${user.uid}`)
      .onSnapshot(
        snap => {
          if (snap.exists()) {
            setProfile({uid: snap.id, ...snap.data()} as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        },
        () => {
          setProfile(null);
          setLoading(false);
        },
      );

    return unsub;
  }, [user]);

  const value = useMemo<UserContextValue>(
    () => ({
      profile,
      approvalStatus: profile?.approvalStatus ?? null,
      isAdmin: profile?.role === 'admin',
      loading,
    }),
    [profile, loading],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUser() {
  return useContext(UserContext);
}
