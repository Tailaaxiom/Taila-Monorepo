// apps/ngo/src/lib/auth/identity.ts
//
// How a person's typed identity becomes a Supabase Auth email.
//
// Two sign-in surfaces, chosen per person by employees.login_mode:
//
//   'code'  — organization id + employee code + password.
//             Field staff on shared devices. Nobody needs an email address.
//   'email' — real email + password. Desk roles and donors.
//
// The synthetic address for code-mode accounts is derived and therefore
// guessable. That is fine: email addresses are identifiers, not secrets. The
// legacy system's failure was deriving the *password* from the employee code
// (`'axm:' + code`), which made every account openable by any colleague who
// could read a task assignee. Passwords here are always chosen by the person
// at activation and never derived from anything. See LEARNINGS.md.

/**
 * Domain for synthetic addresses. Must be a domain you control, and must not
 * accept mail — nothing is ever sent to it, and no password reset can arrive
 * through it. Code-mode accounts reset by having an administrator issue a new
 * setup token, which is a deliberate in-person step.
 */
export const CODE_LOGIN_DOMAIN = 'staff.tailaaxiom.com';

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-');
}

/**
 * Deterministic address for a code-mode account. Must produce identical output
 * on the client (to sign in) and on the server (to create the user), so it
 * lives here and is imported by both.
 */
export function codeLoginEmail(orgId: string, employeeCode: string): string {
  return `${slug(orgId)}.${slug(employeeCode)}@${CODE_LOGIN_DOMAIN}`;
}

export const MIN_PASSWORD_LENGTH = 10;

/**
 * Deliberately length-first rather than a composition rule. Character-class
 * requirements push people toward predictable substitutions, and these accounts
 * are set up on phones by people who are not typing at a keyboard.
 *
 * Rejects the employee code and org id outright: the whole point of the rewrite
 * is that a password is not derivable from a public identifier.
 */
export function validatePassword(
  password: string,
  context: { employeeCode?: string; orgId?: string } = {},
): { ok: true } | { ok: false; reason: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const lower = password.toLowerCase();

  if (context.employeeCode && lower.includes(context.employeeCode.toLowerCase())) {
    return { ok: false, reason: 'Your password cannot contain your employee code.' };
  }
  if (context.orgId && lower.includes(context.orgId.toLowerCase())) {
    return { ok: false, reason: 'Your password cannot contain the organization ID.' };
  }
  if (lower.startsWith('axm:')) {
    return { ok: false, reason: 'That password is not allowed.' };
  }

  return { ok: true };
}
