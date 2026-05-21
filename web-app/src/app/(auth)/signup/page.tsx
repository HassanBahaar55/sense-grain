import Link from 'next/link';

export const metadata = {
  title: 'Create Account — Sense Grain',
};

function PlantIcon() {
  return (
    <svg className="w-9 h-9" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 28V18C12 18 8 14 8 9C12 9 16 13 16 19" fill="#16a34a" />
      <path d="M16 26V16C20 16 24 12 24 7C20 7 16 11 16 17" fill="#22c55e" />
      <path d="M16 28V18" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-black/[0.06] ring-1 ring-black/[0.04] p-8 text-center">

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-[60px] h-[60px] rounded-2xl bg-green-50 ring-1 ring-green-100 flex items-center justify-center">
            <PlantIcon />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          Create your account
        </h1>
        <p className="mt-2.5 text-sm text-gray-500 leading-relaxed">
          Account registration will be available once Firebase Authentication is
          integrated. Check back soon.
        </p>

        {/* Coming soon pill */}
        <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-xs font-semibold text-[#1f5135]">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Coming soon
        </div>

        {/* Back link */}
        <div className="mt-7 pt-6 border-t border-gray-100">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f5135] hover:text-[#174028] transition-colors duration-150 underline-offset-2 hover:underline"
          >
            <ArrowLeftIcon />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
