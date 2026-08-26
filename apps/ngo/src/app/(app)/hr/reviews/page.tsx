// apps/ngo/src/app/(app)/hr/reviews/page.tsx
//
// Performance Reviews — review records per employee. Reads and writes
// performance_reviews (0014), restricted to leadership/hr/admin at the RLS
// layer — this page's own role gate matches, not the only thing standing
// between a role and this data. Personal, sensitive data, deliberately not
// shared with HOD or staff the way tasks/projects/media are — see the
// migration's own comment.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { HrReviewsClient, type ReviewItem } from './HrReviewsClient';

export default async function HrReviewsPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'hr', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Performance Reviews is available to leadership, HR, and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('performance_reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load reviews">{error.message}</PlainMessage>;
  }

  return (
    <HrReviewsClient
      orgId={employee.org_id}
      reviewerCode={employee.employee_code}
      reviewerName={employee.full_name}
      initialReviews={(data ?? []) as ReviewItem[]}
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
