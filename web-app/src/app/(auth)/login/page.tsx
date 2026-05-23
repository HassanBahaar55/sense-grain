import { LoginPage } from '@/features/auth/LoginPage';

export const metadata = {
  title: 'Sign In — Sense Grain',
  description: 'Sign in to your Sense Grain account.',
};

export default function LoginRoute() {
  return <LoginPage />;
}
