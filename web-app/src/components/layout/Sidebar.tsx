'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';

function PlantIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 28V18C12 18 8 14 8 9C12 9 16 13 16 19" fill="#4ade80" />
      <path d="M16 26V16C20 16 24 12 24 7C20 7 16 11 16 17" fill="#86efac" />
      <path d="M16 28V18" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (active: boolean) => (
      <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" opacity={active ? 0.9 : 1} />
        <rect x="14" y="3" width="7" height="7" rx="1.5" opacity={active ? 0.6 : 1} />
        <rect x="3" y="14" width="7" height="7" rx="1.5" opacity={active ? 0.6 : 1} />
        <rect x="14" y="14" width="7" height="7" rx="1.5" opacity={active ? 0.9 : 1} />
      </svg>
    ),
  },
  {
    label: 'Realtime Monitor',
    href: '/monitor',
    icon: () => (
      <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: 'Storage Units',
    href: '/storage',
    icon: () => (
      <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'Alerts',
    href: '/alerts',
    badge: 3,
    icon: () => (
      <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: () => (
      <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: 'Predictions',
    href: '/predictions',
    icon: () => (
      <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: () => (
      <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: () => (
      <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* ── Mobile backdrop ── */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* ── Sidebar panel ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-60 bg-[#0b1d0e] flex flex-col z-30 select-none',
          'will-change-transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* ── Logo ── */}
        <div className="h-16 flex items-center px-5 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1f5135] flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-900/40">
              <PlantIcon />
            </div>
            <div className="leading-none">
              <span className="text-[15px] font-bold text-white tracking-tight block">Sense Grain</span>
              <span className="text-[9px] text-white/30 tracking-widest uppercase block mt-0.5">Monitoring</span>
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto py-5 px-3">
          <p className="text-[9px] font-bold text-white/25 tracking-widest uppercase px-3 mb-3">
            Navigation
          </p>
          <ul className="space-y-px">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative overflow-hidden',
                      isActive
                        ? 'bg-[#1f5135] text-white shadow-sm shadow-green-900/30'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.07]',
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-green-300 rounded-r-full" />
                    )}
                    <span className={cn(
                      'flex-shrink-0 transition-colors duration-200',
                      isActive ? 'text-white' : 'text-white/35 group-hover:text-white/70',
                    )}>
                      {item.icon(isActive)}
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── System Status ── */}
        <div className="px-4 py-3 mx-3 mb-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-400 block" />
              <span className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-60" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white/70 truncate">All Systems Operational</p>
              <p className="text-[9px] text-white/30 mt-0.5">Updated 2 min ago</p>
            </div>
          </div>
        </div>

        {/* ── User ── */}
        <div className="px-3 pb-4 border-t border-white/[0.06] pt-3 flex-shrink-0">
          <button className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-white/[0.07] active:bg-white/[0.10] transition-all duration-200 group text-left">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center flex-shrink-0 text-[13px] font-bold text-white shadow-md">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-white/85 truncate leading-tight">Admin User</p>
              <p className="text-[10px] text-white/30 truncate leading-tight mt-0.5">admin@sensegrain.com</p>
            </div>
            <svg
              className="w-3.5 h-3.5 text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors duration-200"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
