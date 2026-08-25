// apps/ngo/src/app/(app)/staff/dashboard/page.tsx
//
// Real data: tasks table (0005). Filtered to this employee's own tasks — by
// employee_code OR their department, matching the handover's own definition
// of assignee ("an employee_code or a department", section 2).

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseTask } from '@taila/core/types/task';
import { StaffDashboardClient } from './StaffDashboardClient';

export default async function StaffDashboardPage() {
  const employee = await getCurrentEmployee();
  // (app)/layout.tsx already guarantees a session exists — this second call
  // is the known, documented minor redundancy (see docs/EXECUTION.md), kept
  // for the same reason it was kept on Staff Management and Funders: the
  // role/filter values used here must come from the server's own check, not
  // be threaded through from the layout in a way that could be spoofed.
  if (!employee) return null;

  const supabase = await createClient();
  const filters = employee.department
    ? `assignee.eq.${employee.employee_code},dept.eq.${employee.department}`
    : `assignee.eq.${employee.employee_code}`;

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .or(filters)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load tasks</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  return <StaffDashboardClient tasks={(data ?? []).map(parseTask)} />;
}