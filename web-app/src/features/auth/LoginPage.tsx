'use client';

import { useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEmail(value: string): string {
  if (!value.trim()) return 'Email address is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    return 'Please enter a valid email address';
  return '';
}

function validatePassword(value: string): string {
  if (!value) return 'Password is required';
  if (value.length < 6) return 'Password must be at least 6 characters';
  return '';
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlantIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 28V18C12 18 8 14 8 9C12 9 16 13 16 19" fill="#16a34a" />
      <path d="M16 26V16C20 16 24 12 24 7C20 7 16 11 16 17" fill="#22c55e" />
      <path d="M16 28V18" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function HeroPlantIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#22c55e" opacity="0.18" />
      <path d="M16 26V18C13 18 10 15 10 11C13 11 16 14 16 18" fill="#22c55e" />
      <path d="M16 24V16C19 16 22 13 22 9C19 9 16 12 16 16" fill="#4ade80" />
      <path d="M16 27V18" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ThermometerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  );
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GrainStorageSVG() {
  return (
    <svg viewBox="0 0 500 200" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M0 160 Q80 140 160 152 Q240 164 320 148 Q400 132 500 150 L500 200 L0 200 Z" fill="#1a3d20" opacity="0.6" />
      <path d="M0 172 Q100 158 220 168 Q340 178 500 162 L500 200 L0 200 Z" fill="#1f5135" opacity="0.5" />
      <rect x="72" y="72" width="52" height="108" rx="4" fill="#152b1a" />
      <path d="M72 78 Q98 50 124 78" fill="#1a3820" />
      <line x1="72" y1="105" x2="124" y2="105" stroke="#1f4428" strokeWidth="1.5" opacity="0.6" />
      <line x1="72" y1="130" x2="124" y2="130" stroke="#1f4428" strokeWidth="1.5" opacity="0.6" />
      <line x1="72" y1="155" x2="124" y2="155" stroke="#1f4428" strokeWidth="1.5" opacity="0.6" />
      <rect x="132" y="100" width="188" height="80" fill="#152b1a" />
      <polygon points="112,100 226,48 348,100" fill="#102218" />
      <rect x="196" y="140" width="56" height="40" rx="2" fill="#0d1c0f" />
      <line x1="224" y1="155" x2="224" y2="165" stroke="#1a3820" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="148" y="115" width="30" height="22" rx="2" fill="#0d1c0f" />
      <rect x="274" y="115" width="30" height="22" rx="2" fill="#0d1c0f" />
      <rect x="216" y="40" width="14" height="16" fill="#0d1c0f" />
      <rect x="328" y="108" width="46" height="72" rx="4" fill="#152b1a" />
      <path d="M328 113 Q351 90 374 113" fill="#1a3820" />
      <line x1="328" y1="132" x2="374" y2="132" stroke="#1f4428" strokeWidth="1.5" opacity="0.6" />
      <line x1="328" y1="152" x2="374" y2="152" stroke="#1f4428" strokeWidth="1.5" opacity="0.6" />
      <rect x="382" y="122" width="36" height="58" rx="3" fill="#152b1a" opacity="0.85" />
      <path d="M382 126 Q400 107 418 126" fill="#1a3820" opacity="0.85" />
      <rect x="24" y="152" width="6" height="28" fill="#0d1c0f" />
      <ellipse cx="27" cy="146" rx="19" ry="24" fill="#163320" />
      <ellipse cx="37" cy="150" rx="14" ry="18" fill="#1a3d22" opacity="0.8" />
      <rect x="442" y="158" width="5" height="22" fill="#0d1c0f" />
      <ellipse cx="444" cy="152" rx="15" ry="19" fill="#163320" />
      <path d="M0 178 Q250 168 500 178 L500 200 L0 200 Z" fill="#0d1f0f" opacity="0.35" />
    </svg>
  );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-white text-[14px] leading-snug">{title}</p>
        <p className="text-green-200/55 text-[13px] leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function FormErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
      <AlertCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium text-red-700 leading-snug">{message}</p>
      <button type="button" onClick={onDismiss} className="text-red-400 hover:text-red-600 transition-colors duration-150 focus-visible:outline-none rounded" aria-label="Dismiss error">
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LoginPage() {
  const router = useRouter();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(true);
  const [touched, setTouched]           = useState({ email: false, password: false });
  const [isSignInLoading, setIsSignInLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formError, setFormError]       = useState<string | null>(null);

  const anyLoading   = isSignInLoading || isGoogleLoading;
  const emailError   = touched.email    ? validateEmail(email)    : '';
  const passwordError = touched.password ? validatePassword(password) : '';

  const handleSignIn = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setFormError(null);
    if (validateEmail(email) || validatePassword(password)) return;
    setIsSignInLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSignInLoading(false);
    router.push('/dashboard');
  }, [email, password, router]);

  const handleGoogleSignIn = useCallback(async () => {
    setFormError(null);
    setIsGoogleLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsGoogleLoading(false);
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">

      {/* ── Left hero panel ── */}
      <div className="relative hidden lg:flex lg:w-[42%] xl:w-[40%] flex-col overflow-hidden bg-[#0b1d0e]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1d0e] via-[#0e2412] to-[#091508]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-green-950/20" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-green-800/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full p-8 xl:p-10">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <HeroPlantIcon size={34} />
            <span className="text-white font-bold text-[17px] tracking-tight">Sense Grain</span>
          </div>

          {/* Headline */}
          <div className="mt-14 mb-10">
            <h1 className="text-4xl xl:text-[42px] font-extrabold leading-[1.08] tracking-tight">
              <span className="text-green-400">Smart</span>{' '}
              <span className="text-white">Monitoring.</span>
              <br />
              <span className="text-white">Better Storage.</span>
              <br />
              <span className="text-white">Healthier Grain.</span>
            </h1>
            <p className="mt-5 text-green-100/50 text-[14px] leading-relaxed max-w-[300px]">
              Real-time environmental monitoring and AI-powered insights for smarter grain storage management.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-5 flex-1">
            <FeatureItem
              icon={<ThermometerIcon className="w-5 h-5 text-green-300" />}
              title="Real-time Monitoring"
              description="Track temperature, humidity, CO₂ and more in real-time."
            />
            <FeatureItem
              icon={<BarChartIcon className="w-5 h-5 text-green-300" />}
              title="Smart Analytics"
              description="AI-powered insights and predictive analytics."
            />
            <FeatureItem
              icon={<ShieldIcon className="w-5 h-5 text-green-300" />}
              title="Secure & Reliable"
              description="Enterprise-grade security for your critical data."
            />
          </div>

          {/* Illustration */}
          <div className="mt-6 -mb-1 opacity-70">
            <GrainStorageSVG />
          </div>
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-8 bg-gray-50">

        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <HeroPlantIcon size={38} />
          <span className="text-[#1f5135] font-bold text-xl tracking-tight">Sense Grain</span>
        </div>

        {/* Card */}
        <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-black/[0.06] ring-1 ring-black/[0.04] p-6 sm:p-8">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center ring-1 ring-green-100">
                <PlantIcon className="w-8 h-8" />
              </div>
            </div>
            <h2 className="text-[20px] font-bold text-gray-900 tracking-tight">Welcome Back</h2>
            <p className="mt-1 text-[13px] text-gray-500">Sign in to your Sense Grain account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4" noValidate>
            {formError && <FormErrorBanner message={formError} onDismiss={() => setFormError(null)} />}

            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (formError) setFormError(null); }}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              leftIcon={<EnvelopeIcon className="w-[18px] h-[18px]" />}
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
              onChange={(e) => { setPassword(e.target.value); if (formError) setFormError(null); }}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              leftIcon={<LockIcon className="w-[18px] h-[18px]" />}
              error={passwordError}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors duration-150 rounded-lg hover:bg-gray-100 focus-visible:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon className="w-[18px] h-[18px]" /> : <EyeIcon className="w-[18px] h-[18px]" />}
                </button>
              }
              required
              autoComplete="current-password"
              disabled={anyLoading}
            />

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <div className="relative flex items-center">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only peer" />
                  <div className="w-4 h-4 border-2 border-gray-300 rounded transition-colors duration-200 flex items-center justify-center peer-checked:bg-[#1f5135] peer-checked:border-[#1f5135]">
                    {rememberMe && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[13px] text-gray-600 group-hover:text-gray-800 transition-colors">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-[13px] font-semibold text-[#1f5135] hover:text-[#174028] hover:underline underline-offset-2 transition-all duration-150">
                Forgot Password?
              </Link>
            </div>

            <div className="pt-1">
              <Button type="submit" fullWidth size="lg" isLoading={isSignInLoading} disabled={anyLoading}>
                {!isSignInLoading && <LockIcon className="w-[18px] h-[18px]" />}
                Sign In
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-white text-[11px] text-gray-400 font-semibold tracking-widest uppercase">or</span>
            </div>
          </div>

          {/* Google */}
          <Button type="button" variant="outline" fullWidth size="lg" onClick={handleGoogleSignIn} isLoading={isGoogleLoading} disabled={anyLoading}>
            {!isGoogleLoading && <GoogleIcon />}
            Continue with Google
          </Button>

          {/* Admin contact note */}
          <p className="mt-5 text-center text-[12px] text-gray-400 leading-relaxed">
            Need access? Contact your system administrator.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-[11px] text-gray-400">
          © 2026 GrainGuard. All rights reserved.
        </p>
      </div>
    </div>
  );
}
