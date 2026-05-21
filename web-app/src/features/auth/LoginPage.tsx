'use client';

import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Screen = 'signin' | 'sent';

// ─── Icons ────────────────────────────────────────────────────────────────────

function LogoIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#22c55e" opacity="0.12" />
      <path d="M16 26V18C13 18 10 15 10 11C13 11 16 14 16 18" fill="#22c55e" />
      <path d="M16 24V16C19 16 22 13 22 9C19 9 16 12 16 16" fill="#4ade80" />
      <path d="M16 27V18" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
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

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="w-12 h-12 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
    </svg>
  );
}

function GrainBg() {
  return (
    <svg viewBox="0 0 800 220" className="w-full" fill="none" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <path d="M0 170 Q100 145 200 158 Q300 170 400 152 Q500 134 600 148 Q700 162 800 150 L800 220 L0 220 Z" fill="#1a3d20" opacity="0.5" />
      <path d="M0 185 Q150 168 300 178 Q450 188 600 172 Q700 165 800 175 L800 220 L0 220 Z" fill="#1f5135" opacity="0.4" />
      <rect x="100" y="80" width="55" height="120" rx="4" fill="#152b1a" />
      <path d="M100 86 Q127 58 155 86" fill="#1a3820" />
      <line x1="100" y1="110" x2="155" y2="110" stroke="#1f4428" strokeWidth="1" opacity="0.5" />
      <line x1="100" y1="135" x2="155" y2="135" stroke="#1f4428" strokeWidth="1" opacity="0.5" />
      <line x1="100" y1="160" x2="155" y2="160" stroke="#1f4428" strokeWidth="1" opacity="0.5" />
      <rect x="200" y="105" width="220" height="95" fill="#152b1a" />
      <polygon points="170,105 310,50 420,105" fill="#102218" />
      <rect x="290" y="148" width="60" height="52" rx="2" fill="#0d1c0f" />
      <rect x="215" y="120" width="35" height="26" rx="2" fill="#0d1c0f" />
      <rect x="365" y="120" width="35" height="26" rx="2" fill="#0d1c0f" />
      <rect x="440" y="112" width="48" height="88" rx="4" fill="#152b1a" />
      <path d="M440 118 Q464 94 488 118" fill="#1a3820" />
      <line x1="440" y1="138" x2="488" y2="138" stroke="#1f4428" strokeWidth="1" opacity="0.5" />
      <line x1="440" y1="158" x2="488" y2="158" stroke="#1f4428" strokeWidth="1" opacity="0.5" />
      <rect x="496" y="128" width="38" height="72" rx="3" fill="#152b1a" opacity="0.8" />
      <path d="M496 134 Q515 112 534 134" fill="#1a3820" opacity="0.8" />
      <rect x="560" y="145" width="32" height="55" rx="3" fill="#152b1a" opacity="0.6" />
      <path d="M560 150 Q576 133 592 150" fill="#1a3820" opacity="0.6" />
      <rect x="40" y="162" width="6" height="30" fill="#0d1c0f" />
      <ellipse cx="43" cy="155" rx="20" ry="25" fill="#163320" />
      <rect x="660" y="168" width="5" height="24" fill="#0d1c0f" />
      <ellipse cx="663" cy="160" rx="16" ry="20" fill="#163320" />
      <path d="M0 195 Q400 183 800 195 L800 220 L0 220 Z" fill="#0d1f0f" opacity="0.3" />
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LoginPage() {
  const router = useRouter();

  const [screen, setScreen]               = useState<Screen>('signin');
  const [email, setEmail]                 = useState('');
  const [sentTo, setSentTo]               = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLinkLoading, setIsLinkLoading] = useState(false);
  const [error, setError]                 = useState('');
  const [emailError, setEmailError]       = useState('');

  const anyLoading = isGoogleLoading || isLinkLoading;

  // ── Auto-complete sign-in when user returns via email link ──────────────────
  useEffect(() => {
    const tryEmailLink = async () => {
      try {
        const { getAuth, isSignInWithEmailLink, signInWithEmailLink } = await import('firebase/auth');
        const firebaseApp = (await import('@/config/firebase')).default;
        const auth = getAuth(firebaseApp);
        if (!isSignInWithEmailLink(auth, window.location.href)) return;
        const saved = window.localStorage.getItem('emailForSignIn');
        if (!saved) return;
        await signInWithEmailLink(auth, saved, window.location.href);
        window.localStorage.removeItem('emailForSignIn');
        router.push('/dashboard');
      } catch {
        // silently ignore — link expired or already used
      }
    };
    tryEmailLink();
  }, [router]);

  // ── Google Sign-In ──────────────────────────────────────────────────────────
  const handleGoogleSignIn = useCallback(async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const firebaseApp = (await import('@/config/firebase')).default;
      const auth     = getAuth(firebaseApp);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User dismissed — no error shown
      } else if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Please use the main app URL.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection and try again.');
      } else if (code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site.');
      } else {
        setError('Google sign-in failed. Please try the email link option below.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }, [router]);

  // ── Email Magic Link ────────────────────────────────────────────────────────
  const handleSendLink = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) { setEmailError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailError('Enter a valid email address'); return; }
    setEmailError('');
    setIsLinkLoading(true);
    try {
      const { getAuth, sendSignInLinkToEmail } = await import('firebase/auth');
      const firebaseApp = (await import('@/config/firebase')).default;
      const auth = getAuth(firebaseApp);
      await sendSignInLinkToEmail(auth, trimmed, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem('emailForSignIn', trimmed);
      setSentTo(trimmed);
      setScreen('sent');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/invalid-email') {
        setEmailError('Invalid email address.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError('Could not send login link. Please try again.');
      }
    } finally {
      setIsLinkLoading(false);
    }
  }, [email]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#0b1d0e] relative">

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-green-800/10 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 min-h-0">

        {/* Brand */}
        <div className="flex items-center gap-3 mb-7">
          <LogoIcon />
          <div>
            <p className="text-white font-bold text-[18px] tracking-tight leading-none">Sense Grain</p>
            <p className="text-green-400/50 text-[10px] tracking-widest uppercase mt-0.5">Grain Intelligence Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/10 overflow-hidden">

          {screen === 'signin' ? (
            <div className="p-7">

              {/* Heading */}
              <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Sign In</h1>
              <p className="text-[12px] text-gray-400 mt-1">Access your dashboard to continue</p>

              {/* Error */}
              {error && (
                <div className="mt-4 flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-[12px] font-medium text-red-700 flex-1 leading-snug">{error}</p>
                  <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-lg leading-none mt-[-2px]">&times;</button>
                </div>
              )}

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={anyLoading}
                className="mt-5 w-full flex items-center justify-center gap-3 h-11 rounded-xl border-2 border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isGoogleLoading ? <SpinnerIcon /> : <GoogleIcon />}
                {isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-150" /></div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-[10px] text-gray-400 font-semibold tracking-widest uppercase">or sign in with email</span>
                </div>
              </div>

              {/* Email link form */}
              <form onSubmit={handleSendLink} noValidate>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
                  </svg>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); setError(''); }}
                    disabled={anyLoading}
                    autoComplete="email"
                    inputMode="email"
                    className={`w-full h-11 pl-9 pr-4 rounded-xl border text-[13px] text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-150 disabled:opacity-50 ${
                      emailError
                        ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        : 'border-gray-200 bg-white focus:border-[#1f5135] focus:ring-2 focus:ring-green-100'
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="mt-1.5 text-[11px] text-red-600 font-medium">{emailError}</p>
                )}

                <button
                  type="submit"
                  disabled={anyLoading}
                  className="mt-3 w-full h-11 rounded-xl bg-[#1f5135] text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#174028] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-green-900/30"
                >
                  {isLinkLoading ? (
                    <>
                      <SpinnerIcon />
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      Send Login Link
                    </>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-[11px] text-gray-400">
                No account? Contact your system administrator.
              </p>
            </div>

          ) : (
            // ── Check email screen ──
            <div className="p-7 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
                <MailIcon />
              </div>
              <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">Check your email</h2>
              <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
                We sent a login link to
              </p>
              <p className="text-[13px] font-semibold text-gray-800 mt-0.5 break-all">{sentTo}</p>
              <p className="text-[12px] text-gray-400 mt-3 leading-relaxed">
                Click the link in the email to sign in. The link expires in 1 hour.
              </p>

              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => { handleSendLink({ preventDefault: () => {} } as FormEvent); }}
                  disabled={anyLoading}
                  className="w-full h-10 rounded-xl border-2 border-gray-200 bg-white text-[12px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 disabled:opacity-50"
                >
                  {isLinkLoading ? 'Sending…' : 'Resend link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setScreen('signin'); setError(''); }}
                  className="w-full h-10 rounded-xl text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← Use a different email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grain illustration */}
      <div className="relative z-10 flex-shrink-0 w-full pointer-events-none select-none" style={{ height: 'clamp(80px, 18vh, 160px)' }}>
        <div className="absolute bottom-0 left-0 right-0">
          <GrainBg />
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex-shrink-0 text-center pb-3">
        <p className="text-[10px] text-white/20">© 2026 GrainGuard · All rights reserved</p>
      </div>
    </div>
  );
}
