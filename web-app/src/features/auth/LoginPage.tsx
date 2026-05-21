'use client';

import { useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEmail(v: string) {
  if (!v.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email address';
  return '';
}
function validatePassword(v: string) {
  if (!v) return 'Password is required';
  if (v.length < 6) return 'Password must be at least 6 characters';
  return '';
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function LogoIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#22c55e" opacity="0.15" />
      <path d="M16 26V18C13 18 10 15 10 11C13 11 16 14 16 18" fill="#22c55e" />
      <path d="M16 24V16C19 16 22 13 22 9C19 9 16 12 16 16" fill="#4ade80" />
      <path d="M16 27V18" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
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

// ─── Background grain SVG ─────────────────────────────────────────────────────

function GrainBg() {
  return (
    <svg viewBox="0 0 800 220" className="w-full" fill="none" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <path d="M0 170 Q100 145 200 158 Q300 170 400 152 Q500 134 600 148 Q700 162 800 150 L800 220 L0 220 Z" fill="#1a3d20" opacity="0.5" />
      <path d="M0 185 Q150 168 300 178 Q450 188 600 172 Q700 165 800 175 L800 220 L0 220 Z" fill="#1f5135" opacity="0.4" />
      {/* Silos */}
      <rect x="100" y="80" width="55" height="120" rx="4" fill="#152b1a" />
      <path d="M100 86 Q127 58 155 86" fill="#1a3820" />
      <line x1="100" y1="110" x2="155" y2="110" stroke="#1f4428" strokeWidth="1" opacity="0.5" />
      <line x1="100" y1="135" x2="155" y2="135" stroke="#1f4428" strokeWidth="1" opacity="0.5" />
      <line x1="100" y1="160" x2="155" y2="160" stroke="#1f4428" strokeWidth="1" opacity="0.5" />
      {/* Main warehouse */}
      <rect x="200" y="105" width="220" height="95" fill="#152b1a" />
      <polygon points="170,105 310,50 420,105" fill="#102218" />
      <rect x="290" y="148" width="60" height="52" rx="2" fill="#0d1c0f" />
      <rect x="215" y="120" width="35" height="26" rx="2" fill="#0d1c0f" />
      <rect x="365" y="120" width="35" height="26" rx="2" fill="#0d1c0f" />
      {/* Right silos */}
      <rect x="440" y="112" width="48" height="88" rx="4" fill="#152b1a" />
      <path d="M440 118 Q464 94 488 118" fill="#1a3820" />
      <line x1="440" y1="138" x2="488" y2="138" stroke="#1f4428" strokeWidth="1" opacity="0.5" />
      <line x1="440" y1="158" x2="488" y2="158" stroke="#1f4428" strokeWidth="1" opacity="0.5" />
      <rect x="496" y="128" width="38" height="72" rx="3" fill="#152b1a" opacity="0.8" />
      <path d="M496 134 Q515 112 534 134" fill="#1a3820" opacity="0.8" />
      {/* Far right small */}
      <rect x="560" y="145" width="32" height="55" rx="3" fill="#152b1a" opacity="0.6" />
      <path d="M560 150 Q576 133 592 150" fill="#1a3820" opacity="0.6" />
      {/* Trees */}
      <rect x="40" y="162" width="6" height="30" fill="#0d1c0f" />
      <ellipse cx="43" cy="155" rx="20" ry="25" fill="#163320" />
      <rect x="660" y="168" width="5" height="24" fill="#0d1c0f" />
      <ellipse cx="663" cy="160" rx="16" ry="20" fill="#163320" />
      <rect x="700" y="172" width="4" height="20" fill="#0d1c0f" opacity="0.7" />
      <ellipse cx="702" cy="165" rx="13" ry="16" fill="#163320" opacity="0.7" />
      {/* Ground */}
      <path d="M0 195 Q400 183 800 195 L800 220 L0 220 Z" fill="#0d1f0f" opacity="0.3" />
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LoginPage() {
  const router = useRouter();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(true);
  const [touched, setTouched]           = useState({ email: false, password: false });
  const [isSignInLoading, setIsSignInLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError]               = useState('');

  const anyLoading    = isSignInLoading || isGoogleLoading;
  const emailError    = touched.email    ? validateEmail(email)    : '';
  const passwordError = touched.password ? validatePassword(password) : '';

  // ── Google Sign-In (Firebase) ───────────────────────────────────────────────
  const handleGoogleSignIn = useCallback(async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const firebaseApp = (await import('@/config/firebase')).default;
      const auth     = getAuth(firebaseApp);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed') || msg.includes('cancelled')) {
        setError('');
      } else if (msg.includes('network')) {
        setError('Network error. Please check your connection.');
      } else if (msg.includes('not-authorized') || msg.includes('unauthorized-domain')) {
        setError('This domain is not authorized. Contact your administrator.');
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }, [router]);

  // ── Email/Password Sign-In ──────────────────────────────────────────────────
  const handleSignIn = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError('');
    if (validateEmail(email) || validatePassword(password)) return;
    setIsSignInLoading(true);
    try {
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      const firebaseApp = (await import('@/config/firebase')).default;
      const auth = getAuth(firebaseApp);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setIsSignInLoading(false);
    }
  }, [email, password, router]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#0b1d0e] relative">

      {/* ── Background radial glow ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-green-800/10 blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-green-900/10 blur-2xl" />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 min-h-0">

        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-6">
          <LogoIcon />
          <div>
            <p className="text-white font-bold text-[18px] tracking-tight leading-none">Sense Grain</p>
            <p className="text-green-400/60 text-[10px] tracking-widest uppercase mt-0.5">Grain Intelligence Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/10 p-6 sm:p-7">

          {/* Header */}
          <div className="mb-5">
            <h1 className="text-[18px] font-bold text-gray-900 tracking-tight">Sign In</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">Access your dashboard to continue</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 mb-4">
              <AlertIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-[12px] font-medium text-red-700 flex-1">{error}</p>
              <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-600 transition-colors text-lg leading-none">&times;</button>
            </div>
          )}

          {/* Google — primary action */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={anyLoading}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border-2 border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isGoogleLoading ? (
              <svg className="w-4 h-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
            ) : <GoogleIcon />}
            {isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-[10px] text-gray-400 font-semibold tracking-widest uppercase">or sign in with email</span>
            </div>
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleSignIn} className="space-y-3" noValidate>
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              leftIcon={<EnvelopeIcon className="w-[16px] h-[16px]" />}
              error={emailError}
              required
              autoComplete="email"
              inputMode="email"
              disabled={anyLoading}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              leftIcon={<LockIcon className="w-[16px] h-[16px]" />}
              error={passwordError}
              rightElement={
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              }
              required
              autoComplete="current-password"
              disabled={anyLoading}
            />

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className="relative flex items-center">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only peer" />
                  <div className="w-4 h-4 border-2 border-gray-300 rounded transition-colors duration-200 flex items-center justify-center peer-checked:bg-[#1f5135] peer-checked:border-[#1f5135]">
                    {rememberMe && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[12px] text-gray-600">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-[12px] font-semibold text-[#1f5135] hover:text-[#174028] hover:underline underline-offset-2 transition-colors">
                Forgot Password?
              </Link>
            </div>

            <Button type="submit" fullWidth size="lg" isLoading={isSignInLoading} disabled={anyLoading}>
              {!isSignInLoading && <LockIcon className="w-4 h-4" />}
              Sign In
            </Button>
          </form>

          {/* Admin note */}
          <p className="mt-4 text-center text-[11px] text-gray-400 leading-relaxed">
            No account? Contact your system administrator.
          </p>
        </div>
      </div>

      {/* ── Grain facility background illustration ── */}
      <div className="relative z-10 flex-shrink-0 w-full pointer-events-none select-none" style={{ height: 'clamp(80px, 18vh, 160px)' }}>
        <div className="absolute bottom-0 left-0 right-0">
          <GrainBg />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="relative z-10 flex-shrink-0 text-center pb-3">
        <p className="text-[10px] text-white/20">© 2026 GrainGuard · All rights reserved</p>
      </div>
    </div>
  );
}
