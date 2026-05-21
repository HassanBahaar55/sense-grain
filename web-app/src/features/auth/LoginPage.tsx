'use client';

import { useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function validateEmail(v: string) {
  if (!v.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email';
  return '';
}
function validatePassword(v: string) {
  if (!v) return 'Password is required';
  if (v.length < 6) return 'Must be at least 6 characters';
  return '';
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BrandLogo() {
  return (
    <div className="flex items-center gap-3 justify-center mb-8">
      <div className="w-10 h-10 rounded-xl bg-[#1f5135] flex items-center justify-center shadow-lg shadow-green-900/40">
        <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
          <path d="M16 26V18C13 18 10 15 10 11C13 11 16 14 16 18" fill="#4ade80" />
          <path d="M16 24V16C19 16 22 13 22 9C19 9 16 12 16 16" fill="#86efac" />
          <path d="M16 27V18" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="text-white text-[17px] font-bold tracking-tight leading-none">Sense Grain</p>
        <p className="text-green-400/50 text-[9px] tracking-widest uppercase mt-0.5">Grain Intelligence Platform</p>
      </div>
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

function GrainBg() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none select-none" style={{ height: 'clamp(80px, 18vh, 150px)' }}>
      <svg viewBox="0 0 800 220" className="w-full h-full" fill="none" preserveAspectRatio="xMidYMax meet">
        <path d="M0 170 Q100 145 200 158 Q300 170 400 152 Q500 134 600 148 Q700 162 800 150 L800 220 L0 220 Z" fill="#1a3d20" opacity="0.5" />
        <path d="M0 185 Q150 168 300 178 Q450 188 600 172 Q700 165 800 175 L800 220 L0 220 Z" fill="#1f5135" opacity="0.4" />
        <rect x="100" y="80" width="55" height="120" rx="4" fill="#152b1a" />
        <path d="M100 86 Q127 58 155 86" fill="#1a3820" />
        <rect x="200" y="105" width="220" height="95" fill="#152b1a" />
        <polygon points="170,105 310,50 420,105" fill="#102218" />
        <rect x="290" y="148" width="60" height="52" rx="2" fill="#0d1c0f" />
        <rect x="215" y="120" width="35" height="26" rx="2" fill="#0d1c0f" />
        <rect x="365" y="120" width="35" height="26" rx="2" fill="#0d1c0f" />
        <rect x="440" y="112" width="48" height="88" rx="4" fill="#152b1a" />
        <path d="M440 118 Q464 94 488 118" fill="#1a3820" />
        <rect x="40" y="162" width="6" height="30" fill="#0d1c0f" />
        <ellipse cx="43" cy="155" rx="20" ry="25" fill="#163320" />
      </svg>
    </div>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label, type = 'text', placeholder, value, onChange, error, disabled, autoComplete, rightEl,
}: {
  label: string; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; error?: string; disabled?: boolean;
  autoComplete?: string; rightEl?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`w-full h-11 px-3.5 rounded-xl border text-[13px] text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-150 disabled:opacity-50 bg-white ${
            error ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                  : 'border-gray-200 focus:border-[#1f5135] focus:ring-2 focus:ring-green-100'
          } ${rightEl ? 'pr-11' : ''}`}
        />
        {rightEl && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-red-600 font-medium">{error}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LoginPage() {
  const router = useRouter();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [touched, setTouched]           = useState({ email: false, password: false });
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError]               = useState('');

  const anyLoading = isEmailLoading || isGoogleLoading;
  const emailErr   = touched.email    ? validateEmail(email)    : '';
  const passErr    = touched.password ? validatePassword(password) : '';

  const handleGoogle = useCallback(async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const app = (await import('@/config/firebase')).default;
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(getAuth(app), provider);
      router.push('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // dismissed — no error
      } else if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Please use the main app URL: sense-grain-web-app.vercel.app');
      } else if (code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups for this site and try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.');
      } else {
        setError('Google sign-in failed. Please try again or use email below.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }, [router]);

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
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please try again.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a few minutes and try again.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled. Contact your administrator.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.');
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setIsEmailLoading(false);
    }
  }, [email, password, router]);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#0b1d0e] relative">

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-green-800/10 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 min-h-0 overflow-y-auto">
        <BrandLogo />

        <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/10 p-7">

          <h1 className="text-[19px] font-bold text-gray-900 tracking-tight">Welcome back</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Sign in to your Sense Grain account</p>

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[12px] text-red-700 font-medium flex-1 leading-snug">{error}</p>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={anyLoading}
            className="mt-5 w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border-2 border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isGoogleLoading ? <Spinner /> : <GoogleIcon />}
            {isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-[10px] text-gray-400 font-semibold tracking-widest uppercase">or sign in with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            <Field
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(v) => { setEmail(v); setError(''); }}
              error={emailErr}
              disabled={anyLoading}
              autoComplete="email"
            />

            <Field
              label="Password"
              type={showPw ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(v) => { setPassword(v); setError(''); }}
              error={passErr}
              disabled={anyLoading}
              autoComplete="current-password"
              rightEl={
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? (
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
              }
            />

            <div className="flex items-center justify-end pt-0.5">
              <Link
                href="/forgot-password"
                className="text-[12px] font-semibold text-[#1f5135] hover:text-[#174028] hover:underline underline-offset-2 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={anyLoading}
              className="w-full h-11 rounded-xl bg-[#1f5135] text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#174028] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-green-900/30"
            >
              {isEmailLoading ? <><Spinner /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          <p className="mt-5 text-center text-[12px] text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[#1f5135] hover:text-[#174028] hover:underline underline-offset-2 transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>

      {/* Grain illustration */}
      <div className="relative z-10 flex-shrink-0" style={{ height: 'clamp(70px, 15vh, 130px)' }}>
        <GrainBg />
      </div>

      <div className="relative z-10 flex-shrink-0 text-center pb-3">
        <p className="text-[10px] text-white/20">© 2026 GrainGuard · All rights reserved</p>
      </div>
    </div>
  );
}
