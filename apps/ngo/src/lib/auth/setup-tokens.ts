// apps/ngo/src/lib/auth/setup-tokens.ts
//
// Issuing and redeeming first-login setup tokens. Service role throughout,
// because a person redeeming a token has no session yet.
//
// Shape of the flow:
//   1. HR or leadership creates the employees row (no auth user yet).
//   2. issueSetupToken() returns a plaintext token, shown to the administrator
//      once. Only its SHA-256 hash is stored.
//   3. The person enters org id, employee code, token and a password of their
//      choosing. redeemSetupToken() creates the auth user, links it to the
//      employees row, and consumes the token.
//   4. From then on they sign in normally and this path is closed to them.

import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { adminClient } from '@/lib/supabase/admin';
import { codeLoginEmail, validatePassword } from './identity';

const TOKEN_TTL_HOURS = 72;
const MAX_ATTEMPTS = 8;

function hash(token: string): string {
  return createHash('sha256').update(token.trim().toUpperCase()).digest('hex');
}

/**
 * Constant-time comparison. A plain === leaks how much of the token was correct
 * through response timing, which over enough attempts narrows the search.
 */
function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Human-transcribable token. Crockford-style alphabet: no I, L, O, U, so it
 * survives being read aloud over a phone or copied off a screen by someone who
 * is not looking at it closely.
 */
function generateToken(): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i === 3 || i === 7) out += '-';
  }
  return out; // e.g. K3M9-QW2T-8XPR
}

export async function issueSetupToken(params: {
  employeeId: string;
  issuedByEmployeeId: string;
}): Promise<{ token: string; expiresAt: string }> {
  const db = adminClient();

  const { data: employee, error } = await db
    .from('employees')
    .select('id, org_id, auth_user_id')
    .eq('id', params.employeeId)
    .single();

  if (error || !employee) throw new Error('Employee not found.');
  if (employee.auth_user_id) {
    throw new Error('This person already has an account. Reset their password instead.');
  }

  // One live token per person (enforced by a partial unique index too).
  await db
    .from('employee_setup_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('employee_id', params.employeeId)
    .is('consumed_at', null);

  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600_000).toISOString();

  const { error: insertError } = await db.from('employee_setup_tokens').insert({
    org_id: employee.org_id,
    employee_id: employee.id,
    token_hash: hash(token),
    expires_at: expiresAt,
    issued_by: params.issuedByEmployeeId,
  });

  if (insertError) throw new Error('Could not issue a setup token.');

  // Returned once. Not recoverable afterwards — only the hash is stored.
  return { token, expiresAt };
}

type RedeemResult =
  | { ok: true; email: string }
  | { ok: false; reason: string };

export async function redeemSetupToken(params: {
  orgId: string;
  employeeCode: string;
  token: string;
  password: string;
}): Promise<RedeemResult> {
  const db = adminClient();

  // Single generic failure message for every identity mismatch below. Telling
  // the caller which part was wrong turns this endpoint into an oracle for
  // which employee codes exist.
  const generic = 'Those details did not match. Check with your administrator.';

  const passwordCheck = validatePassword(params.password, {
    employeeCode: params.employeeCode,
    orgId: params.orgId,
  });
  if (!passwordCheck.ok) return { ok: false, reason: passwordCheck.reason };

  const { data: employee } = await db
    .from('employees')
    .select('id, org_id, employee_code, email, login_mode, active, auth_user_id')
    .eq('org_id', params.orgId.trim())
    .eq('employee_code', params.employeeCode.trim())
    .maybeSingle();

  if (!employee || !employee.active) return { ok: false, reason: generic };
  if (employee.auth_user_id) {
    return { ok: false, reason: 'This account is already set up. Sign in instead.' };
  }

  const { data: tokenRow } = await db
    .from('employee_setup_tokens')
    .select('id, token_hash, expires_at, attempts, consumed_at')
    .eq('employee_id', employee.id)
    .is('consumed_at', null)
    .maybeSingle();

  if (!tokenRow) return { ok: false, reason: generic };

  if (tokenRow.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'Too many attempts. Ask for a new setup code.' };
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return { ok: false, reason: 'That setup code has expired. Ask for a new one.' };
  }

  if (!hashesMatch(hash(params.token), tokenRow.token_hash)) {
    await db
      .from('employee_setup_tokens')
      .update({ attempts: tokenRow.attempts + 1 })
      .eq('id', tokenRow.id);
    return { ok: false, reason: generic };
  }

  const email =
    employee.login_mode === 'email' && employee.email
      ? employee.email
      : codeLoginEmail(employee.org_id, employee.employee_code);

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password: params.password,
    email_confirm: true, // no mailbox exists for code-mode addresses
    user_metadata: { org_id: employee.org_id, employee_code: employee.employee_code },
  });

  if (createError || !created?.user) {
    return { ok: false, reason: 'Could not complete setup. Try again shortly.' };
  }

  const { error: linkError } = await db
    .from('employees')
    .update({ auth_user_id: created.user.id, password_set_at: new Date().toISOString() })
    .eq('id', employee.id);

  if (linkError) {
    // The auth user exists but is unlinked, so it would satisfy no RLS policy
    // and grant nothing. Remove it rather than leave an orphan that blocks the
    // email address on a later retry.
    await db.auth.admin.deleteUser(created.user.id);
    return { ok: false, reason: 'Could not complete setup. Try again shortly.' };
  }

  await db
    .from('employee_setup_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', tokenRow.id);

  return { ok: true, email };
}
