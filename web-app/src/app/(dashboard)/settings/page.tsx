import { Suspense } from 'react';
import SettingsPage from '@/features/settings/SettingsPage';

export const metadata = { title: 'Settings — Sense Grain' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  );
}
