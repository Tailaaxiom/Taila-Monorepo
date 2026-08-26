// apps/ngo/src/app/(app)/hod/tasks/page.tsx
//
// Department-scoped sibling of leadership/tasks — same tasks table (0005),
// filtered to dept = employee.department, with its own add-task form
// (department field pre-filled and not editable, unlike leadership's
// org-wide version where dept is free text). No new schema.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseTask } from '@taila/core/types/task';
import { HodTasksClient } from './HodTasksClient';

export default async function HodTasksPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['hod', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Tasks is available to HOD and admin accounts.</PlainMessage>;
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
    return <PlainMessage title="Could not load tasks">{error.message}</PlainMessage>;
  }

  return (
    <HodTasksClient
      orgId={employee.org_id}
      department={employee.department}
      employeeCode={employee.employee_code}
      employeeName={employee.full_name}
      employeeRole={employee.role}
      initialTasks={(data ?? []).map(parseTask)}
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
