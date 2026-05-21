'use client';

import { useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';

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
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none select-none" style={{ height: 'clamp(70px, 15vh, 130px)' }}>
      <svg viewBox="0 0 800 220" className="w-full h-full" fill="none" preserveAspectRatio="xMidYMax meet">
        <path d="M0 170 Q100 145 200 158 Q300 170 400 152 Q500 134 600 148 Q700 162 800 150 L800 220 L0 220 Z" fill="#1a3d20" opacity="0.5" />
        <path d="M0 185 Q150 168 300 178 Q450 188 600 172 Q700 165 800 175 L800 220 L0 220 Z" fill="#1f5135" opacity="0.4" />
        <rect x="100" y="80" width="55" height="120" rx="4" fill="#152b1a" />
        <path d="M100 86 Q127 58 155 86" fill="#1a3820" />
        <rect x="200" y="105" width="220" height="95" fill="#152b1a" />
        <polygon points="170,105 310,50 420,105" fill="#102218" />
        <rect x="290" y="148" width="60" height="52" rx="2" fill="#0d1c0f" />
        <rect x="440" y="112" width="48" height="88" rx="4" fill="#152b1a" />
        <path d="M440 118 Q464 94 488 118" fill="#1a3820" />
        <rect x="40" y="162" width="6" height="30" fill="#0d1c0f" />
        <ellipse cx="43" cy="155" rx="20" ry="25" fill="#163320" />
      </svg>
    </div>
  );
}

type Screen = 'form' | 'sent';

export default function ForgotPasswordPage() {
  const [screen, setScreen]     = useState<Screen>('form');
  const [email, setEmail]       = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState('');
  const [sentTo, setSentTo]     = useState('');

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) { setEmailErr('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailErr('Enter a valid email address'); return; }
    setEmailErr('');
    setIsLoading(true);
    try {
      const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
      const app = (await import('@/config/firebase')).default;
      await sendPasswordResetEmail(getAuth(app), trimmed);
      setSentTo(trimmed);
      setScreen('sent');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        // Don't reveal whether account exists — show success anyway for security
        setSentTo(trimmed);
        setScreen('sent');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#0b1d0e] relative">

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-green-800/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 min-h-0">
        <BrandLogo />

        <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/10 p-7">

          {screen === 'form' ? (
            <>
              {/* Key icon */}
              <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#1f5135]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5l3 3L22 7l-3-3" />
                </svg>
              </div>

              <h1 className="text-[19px] font-bold text-gray-900 tracking-tight">Reset password</h1>
              <p className="text-[12px] text-gray-400 mt-0.5">Enter your email and we&apos;ll send you a reset link</p>

              {error && (
                <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-[12px] text-red-700 font-medium flex-1 leading-snug">{error}</p>
                  <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailErr(''); setError(''); }}
                    disabled={isLoading}
                    autoComplete="email"
                    className={`w-full h-11 px-3.5 rounded-xl border text-[13px] text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-150 disabled:opacity-50 bg-white ${
                      emailErr ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                               : 'border-gray-200 focus:border-[#1f5135] focus:ring-2 focus:ring-green-100'
                    }`}
                  />
                  {emailErr && <p className="mt-1 text-[11px] text-red-600 font-medium">{emailErr}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-[#1f5135] text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#174028] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-green-900/30"
                >
                  {isLoading ? <><Spinner /> Sending…</> : 'Send Reset Email'}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-gray-100 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 hover:text-[#1f5135] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Back to Sign In
                </Link>
              </div>
            </>
          ) : (
            // ── Success screen ──
            <>
              <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h1 className="text-[19px] font-bold text-gray-900 tracking-tight">Check your email</h1>
              <p className="text-[12px] text-gray-500 mt-2 leading-relaxed">
                We sent a password reset link to
              </p>
              <p className="text-[13px] font-semibold text-gray-800 mt-0.5 break-all">{sentTo}</p>
              <p className="text-[12px] text-gray-400 mt-3 leading-relaxed">
                Click the link in the email to reset your password. Check your spam folder if you don&apos;t see it.
              </p>

              <button
                type="button"
                onClick={() => { handleSubmit({ preventDefault: () => {} } as FormEvent); }}
                disabled={isLoading}
                className="mt-5 w-full h-10 rounded-xl border-2 border-gray-200 bg-white text-[12px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 disabled:opacity-50"
              >
                {isLoading ? 'Sending…' : 'Resend email'}
              </button>

              <div className="mt-3 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 hover:text-[#1f5135] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative z-10 flex-shrink-0" style={{ height: 'clamp(70px, 15vh, 130px)' }}>
        <GrainBg />
      </div>

      <div className="relative z-10 flex-shrink-0 text-center pb-3">
        <p className="text-[10px] text-white/20">© 2026 GrainGuard · All rights reserved</p>
      </div>
    </div>
  );
}
