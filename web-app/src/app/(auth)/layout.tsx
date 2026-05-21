export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-white relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-100/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-emerald-50/60 blur-3xl" aria-hidden="true" />

      <main className="relative h-full flex items-center justify-center px-4">
        {children}
      </main>
    </div>
  );
}
