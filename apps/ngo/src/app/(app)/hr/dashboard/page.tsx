// apps/ngo/src/app/(app)/hr/dashboard/page.tsx
//
// HR Overview — read-only, per the handover: headcount, department
// spread, review status, recent joiners. Reads employees (org-wide read
// already covered by employees_read_org, 0003) and performance_reviews
// (0014, restricted to leadership/hr/admin — this page's own role gate
// matches that exactly, so no row is filtered out here that RLS wouldn't
// already have excluded).
//
// Split into server page + presentational client component even though
// there's no interactivity at all — same call already made for HOD's Team
// Summaries: the standing rule is the split, not "only when there's a
// form."

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { HrOverviewClient, type HrEmployee, type HrReview } from './HrOverviewClient';

export default async function HrOverviewPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'hr', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">HR Overview is available to leadership, HR, and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const [employeesRes, reviewsRes] = await Promise.all([
    supabase
      .from('employees')
      .select('id, full_name, department, role, active, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('performance_reviews')
      .select('id, employee_code, period, status, rating, created_at')
      .order('created_at', { ascending: false }),
  ]);

  if (employeesRes.error || reviewsRes.error) {
    return (
      <PlainMessage title="Could not load HR Overview">
        {employeesRes.error?.message ?? reviewsRes.error?.message}
      </PlainMessage>
    );
  }

  return (
    <HrOverviewClient
      employees={(employeesRes.data ?? []) as HrEmployee[]}
      reviews={(reviewsRes.data ?? []) as HrReview[]}
    />
  );
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}
