export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Subtle decorative gradients */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-100/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-emerald-50/60 blur-3xl" aria-hidden="true" />

      {/* Centered content */}
      <main className="relative min-h-screen flex items-center justify-center px-4 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
