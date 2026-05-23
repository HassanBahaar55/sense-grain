'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import firebaseApp from '@/config/firebase';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { type AppNotification, type NotifType } from '@/contexts/HeaderContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relTime(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60)    return 'Just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name: string | null, email: string | null): string {
  if (name)  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return 'U';
}

// ─── Calendar Dropdown ───────────────────────────────────────────────────────

const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const QUICK_RANGES = [
  { label: 'Today',      fn: () => new Date() },
  { label: 'Yesterday',  fn: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d; } },
  { label: 'Last 7d',    fn: () => { const d = new Date(); d.setDate(d.getDate() - 6); return d; } },
  { label: 'Last 30d',   fn: () => { const d = new Date(); d.setDate(d.getDate() - 29); return d; } },
];

function CalendarDropdown({ value, onChange, onClose }: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const yr  = view.getFullYear();
  const mo  = view.getMonth();
  const firstDow    = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const cells: number[] = [...Array(firstDow).fill(0), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const isSel   = (d: number) => d > 0 && new Date(yr, mo, d).toDateString() === value.toDateString();
  const isToday = (d: number) => d > 0 && new Date(yr, mo, d).toDateString() === new Date().toDateString();

  return (
    <div className="w-72 bg-white rounded-xl shadow-xl ring-1 ring-black/[0.07] overflow-hidden">
      {/* Quick ranges */}
      <div className="flex flex-wrap gap-1.5 p-3 border-b border-gray-100">
        {QUICK_RANGES.map(r => (
          <button
            key={r.label}
            onClick={() => { onChange(r.fn()); onClose(); }}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors duration-100"
          >
            {r.label}
          </button>
        ))}
      </div>
      {/* Month navigation */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <button
          onClick={() => setView(new Date(yr, mo - 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[13px] font-bold text-gray-800">{MONTHS[mo]} {yr}</span>
        <button
          onClick={() => setView(new Date(yr, mo + 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-3 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider py-0.5">{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 px-3 pb-3 gap-0.5">
        {cells.map((day, i) =>
          day === 0 ? (
            <div key={`e-${i}`} />
          ) : (
            <button
              key={day}
              onClick={() => { onChange(new Date(yr, mo, day)); onClose(); }}
              className={cn(
                'h-8 w-full rounded-lg text-[12px] font-medium transition-all duration-100',
                isSel(day)
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isToday(day)
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {day}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── Notification Icon ────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: NotifType }) {
  const cfg: Record<NotifType, { bg: string; text: string }> = {
    critical:   { bg: 'bg-red-100',    text: 'text-red-600' },
    warning:    { bg: 'bg-amber-100',  text: 'text-amber-600' },
    resolved:   { bg: 'bg-green-100',  text: 'text-green-600' },
    system:     { bg: 'bg-blue-100',   text: 'text-blue-600' },
    prediction: { bg: 'bg-purple-100', text: 'text-purple-600' },
  };
  const { bg, text } = cfg[type];

  return (
    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', bg)}>
      <svg className={cn('w-4 h-4', text)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {type === 'critical'   && <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>}
        {type === 'warning'    && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
        {type === 'resolved'   && <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
        {type === 'system'     && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
        {type === 'prediction' && <><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></>}
      </svg>
    </div>
  );
}

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotificationPanel({ notifications, onMarkRead, onMarkAllRead, onClear, onClearAll }: {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClear: (id: string) => void;
  onClearAll: () => void;
}) {
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl ring-1 ring-black/[0.07] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-gray-900">Notifications</span>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
              {unread} new
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[360px] overscroll-contain">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="w-10 h-10 mb-2.5 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <p className="text-[12px] font-medium">No notifications</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={cn(
                'flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 group hover:bg-gray-50 transition-colors duration-100',
                !n.read && 'bg-blue-50/30'
              )}
            >
              <NotifIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-[12px] font-semibold leading-tight', !n.read ? 'text-gray-900' : 'text-gray-600')}>
                    {n.title}
                  </p>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                    {relTime(n.time)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                {n.warehouse && (
                  <span className="mt-1 inline-block text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    {n.warehouse}
                  </span>
                )}
              </div>
              {/* Action buttons — visible on hover */}
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
                {!n.read && (
                  <button
                    onClick={() => onMarkRead(n.id)}
                    title="Mark as read"
                    className="w-6 h-6 rounded-md flex items-center justify-center text-blue-400 hover:bg-blue-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => onClear(n.id)}
                  title="Dismiss"
                  className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
          <button
            onClick={onClearAll}
            className="text-[11px] font-semibold text-gray-500 hover:text-red-500 transition-colors duration-150"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Profile Menu ─────────────────────────────────────────────────────────────

function ProfileMenu({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const router   = useRouter();

  const handleLogout = useCallback(async () => {
    onClose();
    await signOut(getAuth(firebaseApp));
    router.replace('/login');
  }, [onClose, router]);

  const name  = user?.displayName || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const init  = initials(user?.displayName ?? null, user?.email ?? null);

  return (
    <div className="w-56 bg-white rounded-xl shadow-xl ring-1 ring-black/[0.07] overflow-hidden py-1.5">
      {/* User info */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0 shadow-sm">
            {init}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-gray-900 truncate">{name}</p>
            <p className="text-[10px] text-gray-400 truncate">{email}</p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-100"
        >
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          My Profile
        </Link>
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-100"
        >
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          Settings
        </Link>
      </div>

      {/* Logout */}
      <div className="border-t border-gray-100 py-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-red-500 hover:bg-red-50 transition-colors duration-100"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ─── Dropdown wrapper (shared animation) ─────────────────────────────────────

function DropdownWrap({ open, children, className }: { open: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'absolute top-full mt-2 z-50 transition-all duration-200 origin-top-right',
        open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] sm:text-[16px] font-bold text-gray-900 leading-tight tracking-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-gray-400 leading-tight mt-0.5 truncate hidden sm:block">{subtitle}</p>
        )}
      </div>

    </header>
  );
}
