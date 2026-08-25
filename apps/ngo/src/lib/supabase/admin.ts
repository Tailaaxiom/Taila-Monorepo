// apps/ngo/src/lib/supabase/admin.ts
//
// SERVICE ROLE. Bypasses RLS entirely. Every guarantee in 0003 is void for any
// query made through this client.
//
// The `server-only` import makes bundling this into client code a build error
// rather than a silent key leak. Do not remove it, and do not import this file
// from anything that a component can reach.
//
// Legitimate uses are narrow, and each one should be a named function in this
// file rather than a raw client handed out to callers:
//   * redeeming a setup token (the caller has no session yet, by definition)
//   * issuing setup tokens
//   * provisioning an organization
//
// Anything a signed-in user does on their own behalf goes through server.ts.

import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@taila/core/types/database.types';

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Server-side admin operations are unavailable.',
    );
  }

  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const adminClient = admin;