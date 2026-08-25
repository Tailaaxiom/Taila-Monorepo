// apps/ngo/src/lib/supabase/server.ts
//
// Server client for Server Components, Route Handlers and Server Actions.
// Anon key, carrying the signed-in user's session from cookies — so RLS applies
// exactly as it does in the browser. This is the default choice on the server.

import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@taila/core/types/database.types';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which cannot set cookies.
            // Harmless: middleware refreshes the session on every request.
          }
        },
      },
    },
  );
}

/**
 * The signed-in employee, or null. Reads through RLS, so it can only ever
 * return the caller's own row.
 *
 * Every server-side page should start here rather than trusting a client-sent
 * role — the role decides what renders, and a value that arrived from the
 * browser is a value the browser can change.
 */
export async function getCurrentEmployee() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (error) return null;
  return data;
}