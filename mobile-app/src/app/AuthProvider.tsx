import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {getApp} from '@react-native-firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from '@react-native-firebase/auth';
import type {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';

import {getGoogleWebClientId} from '../services/firebase/googleSigninConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthContextValue = {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Firebase instances (initialized once at module load) ─────────────────────

const firebaseApp = getApp();
const firebaseAuth = getAuth(firebaseApp);
const googleWebClientId = getGoogleWebClientId();

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configure Google Sign-In once when provider mounts
    if (googleWebClientId) {
      GoogleSignin.configure({webClientId: googleWebClientId});
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, nextUser => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,

      async signInWithEmail(email: string, password: string) {
        await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      },

      async signUpWithEmail(name: string, email: string, password: string) {
        const {user: newUser} = await createUserWithEmailAndPassword(
          firebaseAuth,
          email.trim(),
          password,
        );
        await updateProfile(newUser, {displayName: name.trim()});
      },

      async signInWithGoogle() {
        if (!googleWebClientId) {
          const err = new Error(
            'Google Sign-In is not configured. Please add the SHA-1 fingerprint to Firebase Console and enable the Google provider.',
          );
          (err as Error & {code?: string}).code = 'auth/google-not-configured';
          throw err;
        }

        await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
        const response = await GoogleSignin.signIn();

        if (response.type === 'cancelled') {
          const err = new Error('Google sign-in was cancelled.');
          (err as Error & {code?: string}).code = 'auth/cancelled-popup-request';
          throw err;
        }

        const idToken = response.data?.idToken;
        if (!idToken) {
          const err = new Error('Google sign-in did not return an ID token.');
          (err as Error & {code?: string}).code = 'auth/google-missing-id-token';
          throw err;
        }

        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(firebaseAuth, credential);
      },

      async sendPasswordReset(email: string) {
        await sendPasswordResetEmail(firebaseAuth, email.trim());
      },

      async signOutUser() {
        await GoogleSignin.signOut().catch(() => undefined);
        await signOut(firebaseAuth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be called inside <AuthProvider>.');
  }
  return ctx;
}
