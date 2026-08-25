// apps/ngo/src/app/api/auth/issue-setup-token/route.ts
//
// Issues a first-login setup token for an employee who has no auth_user_id
// yet. Authenticated: uses the caller's own RLS-scoped session to look up
// their role (never trust a role sent from the client), then uses the admin
// client only for the actual token write, since employee_setup_tokens has no
// policies any signed-in user could satisfy — see 0002/0003.

import { NextResponse } from 'next/server';
import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { issueSetupToken } from '@/lib/auth/setup-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (!['leadership', 'hr', 'admin'].includes(employee.role)) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const { employeeId } = (body ?? {}) as Record<string, unknown>;
  if (typeof employeeId !== 'string' || !employeeId) {
    return NextResponse.json({ error: 'employeeId is required.' }, { status: 400 });
  }

  // Confirm the target employee is in the caller's own org before touching
  // the admin client, which has no RLS to catch a cross-org mistake for us.
  const supabase = await createClient();
  const { data: target } = await supabase
    .from('employees')
    .select('id, org_id')
    .eq('id', employeeId)
    .maybeSingle();

  if (!target || target.org_id !== employee.org_id) {
    return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
  }

  try {
    const { token, expiresAt } = await issueSetupToken({
      employeeId,
      issuedByEmployeeId: employee.id,
    });
    // Shown once. The caller (an admin) relays it to the employee out of
    // band — WhatsApp, SMS, paper. It is never stored in plaintext anywhere.
    return NextResponse.json({ token, expiresAt });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not issue a setup token.' },
      { status: 400 },
    );
  }
}