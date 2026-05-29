'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import { isAdminEmail, type ApprovalStatus } from '@/lib/accountDb';

const db   = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

interface AuthContextValue {
  user:            User | null;
  loading:         boolean;
  isAdmin:         boolean;
  approvalStatus:  ApprovalStatus | null; // null while loading
  rejectionReason: string | undefined;
  refreshApproval: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, loading: true, isAdmin: false,
  approvalStatus: null, rejectionReason: undefined, refreshApproval: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,            setUser]            = useState<User | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [approvalStatus,  setApprovalStatus]  = useState<ApprovalStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | undefined>(undefined);

  async function fetchApprovalStatus(firebaseUser: User) {
    // Admin is always approved — skip Firestore check
    if (isAdminEmail(firebaseUser.email)) {
      setApprovalStatus('approved');
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (snap.exists()) {
        const data = snap.data();
        const status = (data.approvalStatus as ApprovalStatus) ?? 'pending';
        setApprovalStatus(status);
        if (status === 'rejected') setRejectionReason(data.rejectedReason as string | undefined);
      } else {
        // First login via Google or another provider — create the user doc
        await createUserDocs(firebaseUser, 'pending');
        setApprovalStatus('pending');
      }
    } catch {
      setApprovalStatus('pending');
    }
  }

  async function refreshApproval() {
    if (user) await fetchApprovalStatus(user);
  }

  /** Write users/{uid} and userRequests/{uid} for a new user (idempotent). */
  async function createUserDocs(firebaseUser: User, status: ApprovalStatus) {
    const now = Date.now();
    const userDoc = {
      uid:            firebaseUser.uid,
      email:          firebaseUser.email ?? '',
      displayName:    firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
      approvalStatus: status,
      createdAt:      now,
    };
    const requestDoc = {
      uid:         firebaseUser.uid,
      email:       firebaseUser.email ?? '',
      displayName: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
      requestedAt: now,
      status,
    };
    await Promise.all([
      setDoc(doc(db, 'users', firebaseUser.uid), userDoc, { merge: true }),
      setDoc(doc(db, 'userRequests', firebaseUser.uid), requestDoc, { merge: true }),
    ]);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchApprovalStatus(firebaseUser);
      } else {
        setApprovalStatus(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = isAdminEmail(user?.email);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, approvalStatus, rejectionReason, refreshApproval }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
