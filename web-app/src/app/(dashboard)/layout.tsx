'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';

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
    <SidebarProvider>
      <div className="h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <div className="lg:pl-60 h-full flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
