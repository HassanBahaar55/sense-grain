'use client';

import { useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';

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

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
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
      console.error('[Reset Email Error]', { code, err });
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        // For security, don't reveal whether account exists
        setSentTo(trimmed);
        setScreen('sent');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  return (
    <div className="w-full max-w-[420px]">
      <Logo />

      <div className="bg-white rounded-2xl shadow-xl shadow-emerald-900/[0.04] ring-1 ring-gray-200/80 p-7 sm:p-8">

        {screen === 'form' ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Reset password</h1>
              <p className="text-[13px] text-gray-500 mt-1">
                Enter your email and we&apos;ll send you a reset link
              </p>
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

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-gray-800 mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailErr(''); setError(''); }}
                  disabled={isLoading}
                  autoComplete="email"
                  className={`w-full h-11 px-3.5 rounded-xl border bg-white text-[14px] text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-150 disabled:opacity-50 ${
                    emailErr
                      ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50'
                      : 'border-gray-200 hover:border-gray-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50'
                  }`}
                />
                {emailErr && <p className="mt-1 text-[12px] text-red-600 font-medium">{emailErr}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-900/20"
              >
                {isLoading ? <><Spinner /> Sending…</> : 'Send reset link'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 7L2 7" />
                </svg>
              </div>
            </div>

            <div className="text-center mb-5">
              <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Check your email</h1>
              <p className="text-[13px] text-gray-500 mt-2">We sent a password reset link to</p>
              <p className="text-[13px] font-semibold text-gray-900 mt-0.5 break-all">{sentTo}</p>
            </div>

            <p className="text-[12.5px] text-gray-500 text-center leading-relaxed mb-5">
              Click the link in your email to reset your password.<br />
              Check your spam folder if you don&apos;t see it.
            </p>

            <button
              type="button"
              onClick={() => { handleSubmit({ preventDefault: () => {} } as FormEvent); }}
              disabled={isLoading}
              className="w-full h-11 rounded-xl border border-gray-200 bg-white text-[13.5px] font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 disabled:opacity-50"
            >
              {isLoading ? 'Sending…' : 'Resend email'}
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-[13px] text-gray-500">
        <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
