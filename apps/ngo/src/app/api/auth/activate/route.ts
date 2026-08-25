// apps/ngo/src/app/api/auth/activate/route.ts
//
// Redeems a setup token and creates the account. Unauthenticated by necessity:
// the caller has no session yet, which is the whole point of the endpoint.
//
// It therefore gets the strictest input handling in the app. It never reveals
// whether an organization or employee code exists, and it returns the same
// message for every identity mismatch.

import { NextResponse } from 'next/server';
import { redeemSetupToken } from '@/lib/auth/setup-tokens';

export const runtime = 'nodejs'; // node:crypto
export const dynamic = 'force-dynamic';

function isNonEmptyString(v: unknown, max = 200): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { orgId, employeeCode, token, password } = (body ?? {}) as Record<string, unknown>;

  if (
    !isNonEmptyString(orgId, 64) ||
    !isNonEmptyString(employeeCode, 64) ||
    !isNonEmptyString(token, 64) ||
    !isNonEmptyString(password, 200)
  ) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  try {
    const result = await redeemSetupToken({ orgId, employeeCode, token, password });

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    // The email is returned so the sign-in form can complete without the client
    // having to re-derive it. It is not a secret; it is derivable from the org
    // id and employee code the caller just supplied.
    return NextResponse.json({ ok: true, email: result.email });
  } catch {
    return NextResponse.json(
      { error: 'Could not complete setup. Try again shortly.' },
      { status: 500 },
    );
  }
}