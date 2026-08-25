// apps/ngo/src/app/(app)/layout.tsx
//
// Every route in this group requires a real signed-in employee — see
// RealCurrentUserProvider, which redirects to /sign-in if there isn't one.
// (auth)/sign-in and (auth)/activate live OUTSIDE this group specifically so
// they never go through that check.

import { AppShell } from '@taila/core/components/shell/AppShell';
import { RealCurrentUserProvider } from '@/lib/auth/RealCurrentUserProvider';

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealCurrentUserProvider>
      <AppShell>{children}</AppShell>
    </RealCurrentUserProvider>
  );
}