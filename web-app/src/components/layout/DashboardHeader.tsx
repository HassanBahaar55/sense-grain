'use client';

import { useSidebar } from '@/contexts/SidebarContext';

function getTodayLabel() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const { toggle } = useSidebar();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-20 flex-shrink-0">

      {/* Hamburger — mobile only */}
      <button
        onClick={toggle}
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all duration-150 flex-shrink-0"
        aria-label="Open navigation menu"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] sm:text-[16px] font-bold text-gray-900 leading-tight tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] text-gray-400 leading-tight mt-0.5 truncate hidden sm:block">{subtitle}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">

        {/* Date */}
        <div className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-semibold text-gray-600 select-none">
          <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{getTodayLabel()}</span>
        </div>

        {/* Live indicator */}
        <div className="hidden lg:flex items-center gap-1.5 h-8 px-3 rounded-lg bg-green-50 border border-green-100 text-[11px] font-semibold text-green-700 select-none">
          <span className="relative flex">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-400 animate-ping opacity-70" />
          </span>
          Live
        </div>

        {/* Notification bell */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-700 active:scale-95 transition-all duration-150">
          <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute -top-1 -right-1 w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white">
            3
          </span>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 hidden md:block" />

        {/* User avatar */}
        <button className="flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 active:scale-[0.97] transition-all duration-150 group">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center text-[11px] font-bold text-white shadow-sm flex-shrink-0">
            A
          </div>
          <span className="hidden md:block text-[12px] font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
            Admin
          </span>
          <svg className="hidden md:block w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

      </div>
    </header>
  );
}
