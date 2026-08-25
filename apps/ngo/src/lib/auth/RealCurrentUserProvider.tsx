// apps/ngo/src/lib/auth/RealCurrentUserProvider.tsx
//
// Replaces the old PreviewProvider everywhere in the (app) route group.
// Server component: fetches the REAL signed-in employee and org through RLS,
// then hands them to core's generic CurrentUserProvider — the same context
// Sidebar, TopBar, and every page already read via useCurrentUser(). Nothing
// downstream needed to change; only this plumbing did. See
// docs/EXECUTION.md, "Retiring the preview switcher".
//
// Deliberately lives under (app), not the root layout: (auth)/sign-in and
// (auth)/activate must render for people who are NOT signed in yet, so they
// cannot be wrapped in something that requires a session to exist.

import { redirect } from 'next/navigation';
import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { CurrentUserProvider } from '@taila/core/context/current-user';
import { parseEmployee } from '@taila/core/types/employee';
import { parseOrganization } from '@taila/core/types/organization';

export async function RealCurrentUserProvider({ children }: { children: React.ReactNode }) {
  const employeeRow = await getCurrentEmployee();

  // Middleware already redirects unauthenticated traffic away from every
  // route except the ones in PUBLIC_PATHS — so reaching here with no
  // employee row means one of two things: the auth.users record exists but
  // has no matching employees row (auth_user_id never linked), or the
  // employee was deactivated. Either way, sending them to sign-in is the
  // safe default rather than rendering a shell with no data behind it.
  if (!employeeRow) {
    redirect('/sign-in');
  }

  const supabase = await createClient();
  const { data: orgRow, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', employeeRow.org_id)
    .maybeSingle();

  if (error || !orgRow) {
    return (
      <div style={{ maxWidth: 480, margin: '4rem auto', fontFamily: 'sans-serif' }}>
        <h1>Organization not found</h1>
        <p>
          Your account is linked to organization <code>{employeeRow.org_id}</code>, but no
          matching row exists in <code>organizations</code>. This should not happen outside
          local testing with mismatched seed data.
        </p>
      </div>
    );
  }

  const employee = parseEmployee(employeeRow);
  const org = parseOrganization(orgRow);

  return <CurrentUserProvider value={{ org, employee }}>{children}</CurrentUserProvider>;
}