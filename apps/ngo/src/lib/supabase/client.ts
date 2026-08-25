// apps/ngo/src/lib/supabase/client.ts
//
// Browser client. Anon key only, so every query it makes is subject to RLS.
// Safe to import from client components.

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@taila/core/types/database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}