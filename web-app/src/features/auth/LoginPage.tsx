'use client';

import { useState, useCallback, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function validateEmail(v: string) {
  if (!v.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email address';
  return '';
}
function validatePassword(v: string) {
  if (!v) return 'Password is required';
  if (v.length < 6) return 'Must be at least 6 characters';
  return '';
}

function Logo() {
  return (
    <div className="flex flex-col items-center mb-6">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-900/20 mb-3">
        <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
          <path d="M16 26V18C13 18 10 15 10 11C13 11 16 14 16 18" fill="#a7f3d0" />
          <path d="M16 24V16C19 16 22 13 22 9C19 9 16 12 16 16" fill="#d1fae5" />
          <path d="M16 27V18" stroke="#a7f3d0" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Sense Grain</h2>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] flex-shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function Input({
  label, type = 'text', placeholder, value, onChange, error, disabled, autoComplete, rightEl,
}: {
  label: string; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; error?: string; disabled?: boolean;
  autoComplete?: string; rightEl?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-gray-800 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`w-full h-11 px-3.5 rounded-xl border bg-white text-[14px] text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-150 disabled:opacity-50 disabled:bg-gray-50 ${
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50'
              : 'border-gray-200 hover:border-gray-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50'
          } ${rightEl ? 'pr-11' : ''}`}
        />
        {rightEl && <div className="absolute right-1 top-1/2 -translate-y-1/2">{rightEl}</div>}
      </div>
      {error && <p className="mt-1 text-[12px] text-red-600 font-medium">{error}</p>}
    </div>
  );
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
      tabIndex={-1}
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 0 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

export function LoginPage() {
  const router = useRouter();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [touched, setTouched]     = useState({ email: false, password: false });
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError]         = useState('');

  const anyLoading = isEmailLoading || isGoogleLoading;
  const emailErr   = touched.email    ? validateEmail(email)       : '';
  const passErr    = touched.password ? validatePassword(password) : '';

  // Handle Google redirect result on page load
  useEffect(() => {
    let cancelled = false;
    const checkRedirect = async () => {
      try {
        const { getAuth, getRedirectResult } = await import('firebase/auth');
        const app = (await import('@/config/firebase')).default;
        const auth = getAuth(app);

        // If user is already signed in, go to dashboard
        if (auth.currentUser) {
          router.push('/dashboard');
          return;
        }

        setIsGoogleLoading(true);
        const result = await getRedirectResult(auth);
        if (cancelled) return;

        if (result?.user) {
          router.push('/dashboard');
          return;
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const code = (err as { code?: string }).code ?? '';
        console.error('[Google Redirect Result Error]', { code, err });
        if (code === 'auth/unauthorized-domain') {
          setError('This domain is not authorized for Google sign-in. Please contact support.');
        } else if (code === 'auth/operation-not-allowed') {
          setError('Google sign-in is not enabled. Please contact support.');
        } else if (code && code !== 'auth/null-user') {
          setError(`Google sign-in failed: ${code}`);
        }
      } finally {
        if (!cancelled) setIsGoogleLoading(false);
      }
    };
    checkRedirect();
    return () => { cancelled = true; };
  }, [router]);

  const handleGoogle = useCallback(async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const { getAuth, signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
      const app = (await import('@/config/firebase')).default;
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(getAuth(app), provider);
      // Page redirects to Google — code below won't run
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      console.error('[Google Sign-In Error]', { code, err });
      if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Google sign-in. Please contact support.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled in Firebase Console.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else if (code) {
        setError(`Sign-in failed: ${code}`);
      } else {
        setError('Google sign-in failed. Please try again.');
      }
      setIsGoogleLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError('');
    if (validateEmail(email) || validatePassword(password)) return;
    setIsEmailLoading(true);
    try {
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      const app = (await import('@/config/firebase')).default;
      await signInWithEmailAndPassword(getAuth(app), email.trim(), password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      console.error('[Email Sign-In Error]', { code, err });
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please try again.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait and try again.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setIsEmailLoading(false);
    }
  }, [email, password, router]);

  return (
    <div className="w-full max-w-[420px]">
      <Logo />

      <div className="bg-white rounded-2xl shadow-xl shadow-emerald-900/[0.04] ring-1 ring-gray-200/80 p-7 sm:p-8">

        <div className="text-center mb-6">
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Welcome back</h1>
          <p className="text-[13px] text-gray-500 mt-1">Sign in to continue to your dashboard</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 mb-5">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-[12.5px] text-red-700 font-medium flex-1 leading-snug">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-lg leading-none -mt-1">&times;</button>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={anyLoading}
          className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border border-gray-200 bg-white text-[14px] font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGoogleLoading ? <Spinner /> : <GoogleIcon />}
          {isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-white text-[11px] text-gray-400 font-medium uppercase tracking-wider">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(v) => { setEmail(v); setError(''); }}
            error={emailErr}
            disabled={anyLoading}
            autoComplete="email"
          />

          <Input
            label="Password"
            type={showPw ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(v) => { setPassword(v); setError(''); }}
            error={passErr}
            disabled={anyLoading}
            autoComplete="current-password"
            rightEl={<EyeToggle show={showPw} onToggle={() => setShowPw((v) => !v)} />}
          />

          <div className="flex justify-end -mt-1">
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={anyLoading}
            className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-900/20"
          >
            {isEmailLoading ? <><Spinner /> Signing in…</> : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-[13px] text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}
