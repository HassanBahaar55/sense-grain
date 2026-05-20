import type {Metadata} from 'next';
import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
