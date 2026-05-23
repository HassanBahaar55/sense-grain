'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { HeaderProvider } from '@/contexts/HeaderContext';
import { UserProvider } from '@/contexts/UserContext';
import { LiveDataProvider } from '@/contexts/LiveDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// ─── Mobile bottom navigation ─────────────────────────────────────────────────

const BOTTOM_TABS = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" opacity={active ? 0.9 : 1} />
        <rect x="14" y="3" width="7" height="7" rx="1.5" opacity={active ? 0.6 : 1} />
        <rect x="3" y="14" width="7" height="7" rx="1.5" opacity={active ? 0.6 : 1} />
        <rect x="14" y="14" width="7" height="7" rx="1.5" opacity={active ? 0.9 : 1} />
      </svg>
    ),
  },
  {
    href: '/monitor',
    label: 'Monitor',
    icon: (_active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/alerts',
    label: 'Alerts',
    badge: 3,
    icon: (_active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    href: '/storage',
    label: 'Storage',
    icon: (_active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (_active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {BOTTOM_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex-1 flex flex-col items-center justify-center gap-1 pt-2.5 pb-2.5 min-h-[56px] select-none transition-colors duration-150',
                isActive ? 'text-[#1f5135]' : 'text-gray-400 active:text-gray-600',
              )}
            >
              {/* Active indicator bar at top */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-[2px] bg-[#1f5135] rounded-full" />
              )}

              {/* Icon with optional badge */}
              <span className="relative flex items-center justify-center">
                {tab.icon(isActive)}
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white">
                    {tab.badge}
                  </span>
                )}
              </span>

              {/* Label */}
              <span className={cn(
                'text-[9px] font-semibold leading-none tracking-wide',
                isActive ? 'text-[#1f5135]' : 'text-gray-400',
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <svg className="w-6 h-6 animate-spin text-emerald-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <UserProvider>
      <LiveDataProvider>
        <HeaderProvider>
          <SidebarProvider>
            <div className="h-screen overflow-hidden bg-gray-50">
              <Sidebar />
              {/* pb-14 on mobile reserves space so content never hides under the bottom nav */}
              <div className="lg:pl-60 h-full flex flex-col overflow-hidden pb-14 lg:pb-0">
                {children}
              </div>
              <BottomNav />
            </div>
          </SidebarProvider>
        </HeaderProvider>
      </LiveDataProvider>
    </UserProvider>
  );
}
