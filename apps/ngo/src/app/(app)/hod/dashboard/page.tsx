// apps/ngo/src/app/(app)/hod/dashboard/page.tsx
//
// Department-scoped sibling of staff/dashboard — same tasks table (0005),
// same stat-tile shape, but scoped to every task in the HOD's own
// department (dept = employee.department) rather than just their own
// assignee. No new schema: tasks.dept already exists and is exactly what
// this page needs.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseTask } from '@taila/core/types/task';
import { HodDashboardClient } from './HodDashboardClient';

export default async function HodDashboardPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['hod', 'admin'].includes(employee.role)) {
    return (
      <PlainMessage title="Not permitted">Dept Dashboard is available to HOD and admin accounts.</PlainMessage>
    );
  }
  if (!employee.department) {
    return (
      <PlainMessage title="No department assigned">
        Your account has no department set — ask an admin to set one on your employee record
        before this page has anything to show.
      </PlainMessage>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('dept', employee.department)
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load the dashboard">{error.message}</PlainMessage>;
  }

  return <HodDashboardClient department={employee.department} tasks={(data ?? []).map(parseTask)} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}
