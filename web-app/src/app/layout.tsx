import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'Sense Grain',
  description: 'Grain monitoring dashboard for operations and hardware telemetry.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sg-theme');var s=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(s)document.documentElement.classList.add('dark');}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
