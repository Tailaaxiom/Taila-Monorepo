// apps/ngo/src/app/(app)/donor/impact/page.tsx
//
// The donor's headline "what did our money achieve" view (handover section
// 4). Reads activities and programmes — activities_read_org and
// programmes_read_org (0004) permit any org member including a donor, no
// donor-specific policy needed here, unlike funds and media below.
//
// Gated to the donor role at the PAGE level, not because RLS requires it —
// a staff account reading this same data would work fine — but because this
// specific route is the donor's framing of it (handover: p-donor-impact is
// a distinct page id from the staff "Impact and Reach" page, not yet
// built). Read-only by construction: no write form anywhere on this page.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { DonorImpactClient, type ActivityItem, type ProgrammeItem } from './DonorImpactClient';

export default async function DonorImpactPage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null;
  if (employee.role !== 'donor') {
    return (
      <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
        <h1>Not permitted</h1>
        <p>The Impact Report is the donor portal's own view.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [activitiesRes, programmesRes] = await Promise.all([
    supabase
      .from('activities')
      .select('id, title, activity_type, activity_date, location, beneficiaries, impact_score')
      .order('impact_score', { ascending: false }),
    supabase.from('programmes').select('id, name, status'),
  ]);

  if (activitiesRes.error || programmesRes.error) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load impact data</h1>
        <p>{activitiesRes.error?.message ?? programmesRes.error?.message}</p>
      </div>
    );
  }

  return (
    <DonorImpactClient
      activities={(activitiesRes.data ?? []) as ActivityItem[]}
      programmes={(programmesRes.data ?? []) as ProgrammeItem[]}
    />
  );
}