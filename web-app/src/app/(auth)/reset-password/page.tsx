'use client';

import { useState, useCallback, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import firebaseApp from '@/config/firebase';
import { Suspense } from 'react';

// ─── Shared UI ────────────────────────────────────────────────────────────────

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

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} tabIndex={-1}
      className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
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

// ─── Password strength ────────────────────────────────────────────────────────

interface StrengthRule {
  label: string;
  test:  (v: string) => boolean;
}

const RULES: StrengthRule[] = [
  { label: 'At least 8 characters',        test: v => v.length >= 8 },
  { label: 'One uppercase letter (A–Z)',    test: v => /[A-Z]/.test(v) },
  { label: 'One lowercase letter (a–z)',    test: v => /[a-z]/.test(v) },
  { label: 'One number (0–9)',              test: v => /[0-9]/.test(v) },
  { label: 'One special character (!@#…)', test: v => /[^A-Za-z0-9]/.test(v) },
];

function strengthLevel(pw: string): 0 | 1 | 2 | 3 {
  const passed = RULES.filter(r => r.test(pw)).length;
  if (passed <= 1) return 0;
  if (passed <= 2) return 1;
  if (passed <= 3) return 2;
  return 3;
}

const STRENGTH_META = [
  { label: 'Weak',   color: 'bg-red-500'    },
  { label: 'Fair',   color: 'bg-yellow-500' },
  { label: 'Good',   color: 'bg-blue-500'   },
  { label: 'Strong', color: 'bg-emerald-500'},
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const level = strengthLevel(password);
  const meta  = STRENGTH_META[level];
  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= level ? meta.color : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className={`text-[11.5px] font-semibold ${['text-red-600','text-yellow-600','text-blue-600','text-emerald-600'][level]}`}>
        {meta.label} password
      </p>
      {/* Rule checklist */}
      <ul className="space-y-0.5">
        {RULES.map((r, i) => {
          const ok = r.test(password);
          return (
            <li key={i} className="flex items-center gap-1.5">
              <svg className={`w-3 h-3 flex-shrink-0 ${ok ? 'text-emerald-500' : 'text-gray-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                {ok ? <><polyline points="20 6 9 17 4 12" /></> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
              </svg>
              <span className={`text-[11px] ${ok ? 'text-emerald-700' : 'text-gray-400'}`}>{r.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function validateNewPassword(pw: string): string {
  if (!pw) return 'New password is required';
  const failed = RULES.filter(r => !r.test(pw));
  if (failed.length) return failed[0].label + ' is required';
  return '';
}

// ─── Screens ──────────────────────────────────────────────────────────────────

type Screen = 'verifying' | 'form' | 'success' | 'invalid';

function ResetPasswordInner() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const oobCode       = searchParams.get('oobCode') ?? '';
  const mode          = searchParams.get('mode') ?? '';

  const [screen,    setScreen]    = useState<Screen>('verifying');
  const [email,     setEmail]     = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState('');
  const [countdown, setCountdown] = useState(5);

  // 1. Verify the oobCode on mount
  useEffect(() => {
    if (!oobCode || mode !== 'resetPassword') {
      setScreen('invalid');
      return;
    }
    const auth = getAuth(firebaseApp);
    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => { setEmail(userEmail); setScreen('form'); })
      .catch((err) => {
        console.error('[verifyPasswordResetCode]', err);
        setScreen('invalid');
      });
  }, [oobCode, mode]);

  // 2. Redirect countdown after success
  useEffect(() => {
    if (screen !== 'success') return;
    if (countdown <= 0) { router.replace('/login'); return; }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [screen, countdown, router]);

  // 3. Submit new password
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const pwErr = validateNewPassword(newPw);
    if (pwErr) { setError(pwErr); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }

    setIsLoading(true);
    try {
      const auth = getAuth(firebaseApp);
      await confirmPasswordReset(auth, oobCode, newPw);
      setScreen('success');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      console.error('[confirmPasswordReset]', { code, err });
      if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        setScreen('invalid');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.');
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [oobCode, newPw, confirmPw]);

  const allRulesPass = RULES.every(r => r.test(newPw));

  // ── Verifying screen ──
  if (screen === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Spinner />
        <p className="text-[13px] text-gray-500">Verifying your reset link…</p>
      </div>
    );
  }

  // ── Invalid / expired screen ──
  if (screen === 'invalid') {
    return (
      <>
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>
        <div className="text-center mb-6">
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Link expired or invalid</h1>
          <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
            This password reset link has expired or already been used.
            Reset links are valid for <strong>1 hour</strong> and can only be used once.
          </p>
        </div>
        <Link href="/forgot-password"
          className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-150 shadow-sm shadow-emerald-900/20"
        >
          Request a new link
        </Link>
      </>
    );
  }

  // ── Success screen ──
  if (screen === 'success') {
    return (
      <>
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <div className="text-center mb-5">
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Password updated!</h1>
          <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
            Your password has been successfully changed.<br />
            You can now sign in with your new password.
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-5 text-center">
          <p className="text-[12.5px] text-emerald-700 font-medium">
            Account: <span className="font-bold">{email}</span>
          </p>
        </div>
        <Link href="/login"
          className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-150 shadow-sm shadow-emerald-900/20"
        >
          Sign in → {countdown > 0 && <span className="text-emerald-200 text-[12px]">({countdown}s)</span>}
        </Link>
      </>
    );
  }

  // ── Form screen ──
  return (
    <>
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Create new password</h1>
        {email && (
          <p className="text-[12.5px] text-gray-500 mt-1">
            for <span className="font-semibold text-gray-700">{email}</span>
          </p>
        )}
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
        {/* New password */}
        <div>
          <label className="block text-[13px] font-semibold text-gray-800 mb-1.5">New password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              placeholder="Create a strong password"
              value={newPw}
              onChange={(e) => { setNewPw(e.target.value); setError(''); }}
              disabled={isLoading}
              autoComplete="new-password"
              className="w-full h-11 px-3.5 pr-11 rounded-xl border border-gray-200 hover:border-gray-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50 bg-white text-[14px] text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-150 disabled:opacity-50"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <EyeToggle show={showNew} onToggle={() => setShowNew(v => !v)} />
            </div>
          </div>
          <PasswordStrength password={newPw} />
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-[13px] font-semibold text-gray-800 mb-1.5">Confirm password</label>
          <div className="relative">
            <input
              type={showConf ? 'text' : 'password'}
              placeholder="Re-enter your new password"
              value={confirmPw}
              onChange={(e) => { setConfirmPw(e.target.value); setError(''); }}
              disabled={isLoading}
              autoComplete="new-password"
              className={`w-full h-11 px-3.5 pr-11 rounded-xl border bg-white text-[14px] text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-150 disabled:opacity-50 ${
                confirmPw && confirmPw !== newPw
                  ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50'
                  : 'border-gray-200 hover:border-gray-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50'
              }`}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <EyeToggle show={showConf} onToggle={() => setShowConf(v => !v)} />
            </div>
          </div>
          {confirmPw && confirmPw !== newPw && (
            <p className="mt-1 text-[12px] text-red-600 font-medium">Passwords do not match</p>
          )}
          {confirmPw && confirmPw === newPw && allRulesPass && (
            <p className="mt-1 text-[12px] text-emerald-600 font-medium flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Passwords match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !allRulesPass || newPw !== confirmPw}
          className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-900/20"
        >
          {isLoading ? <><Spinner /> Updating password…</> : 'Update password'}
        </button>
      </form>

      <p className="mt-4 text-[11.5px] text-gray-400 text-center">
        This link can only be used once and expires in 1 hour.
      </p>
    </>
  );
}

// useSearchParams requires Suspense boundary
export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-[420px]">
      <Logo />
      <div className="bg-white rounded-2xl shadow-xl shadow-emerald-900/[0.04] ring-1 ring-gray-200/80 p-7 sm:p-8">
        <Suspense fallback={
          <div className="flex flex-col items-center gap-3 py-8">
            <Spinner />
            <p className="text-[13px] text-gray-500">Loading…</p>
          </div>
        }>
          <ResetPasswordInner />
        </Suspense>
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
