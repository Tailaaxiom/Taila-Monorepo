// apps/ngo/src/app/(app)/donor/media/page.tsx
//
// The strictest RLS case in the app. media_read_by_donor (0004) requires
// BOTH org match AND donor_visible = true — opt-in, not opt-out, a
// deliberate departure from the legacy schema (which had no sharing flag on
// media at all — see 0004's own comment). The same rule is enforced a
// second time at the storage layer (0007, media_storage_select_by_donor),
// so a donor can't read a file's bytes just by knowing its path even if
// they somehow saw this row.
//
// Staff upload media at /leadership/media, which sets donor_visible.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { DonorMediaClient, type MediaItem } from './DonorMediaClient';

export default async function DonorMediaPage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null;
  if (employee.role !== 'donor') {
    return (
      <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
        <h1>Not permitted</h1>
        <p>Media Library is the donor portal's own view.</p>
      </div>
    );
  }

  const supabase = await createClient();
  // No .eq('donor_visible', true) filter needed here — media_read_by_donor
  // already enforces it at the RLS layer. Left unfiltered deliberately, so
  // this query is a direct test of the policy rather than the query itself
  // doing the work RLS should be doing.
  const { data, error } = await supabase
    .from('media')
    .select('id, caption, file_path, file_type, uploaded_by_name, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load media</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  return <DonorMediaClient items={(data ?? []) as MediaItem[]} />;
}