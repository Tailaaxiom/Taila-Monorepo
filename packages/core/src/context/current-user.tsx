// packages/core/src/context/current-user.tsx
//
// core must never know which sector, which org, or which person is signed
// in — that is exactly the kind of thing that leaked here before (see
// docs/LEARNINGS.md, "Sidebar/TopBar imported their own fixture data").
// This file defines the SHAPE of "who is using the app right now" and
// nothing else. No default organization, no default employee, no mock data.
//
// Every consuming app is responsible for wrapping its tree in
// <CurrentUserProvider value={...}>. In apps/ngo this is now backed by the
// real signed-in session — see apps/ngo/src/lib/auth/RealCurrentUserProvider.tsx.
// Nothing in Sidebar, TopBar, or any page needs to change if that provider
// is ever swapped again.

'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Organization } from '../types/organization';
import type { Employee } from '../types/employee';

export interface CurrentUser {
  org: Organization;
  employee: Employee;
}

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({
  value,
  children,
}: {
  value: CurrentUser;
  children: ReactNode;
}) {
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUser {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error(
      'useCurrentUser() was called without a CurrentUserProvider above it in the tree. ' +
        'Every app must wrap its layout in one — see apps/ngo/src/app/layout.tsx.',
    );
  }
  return ctx;
}