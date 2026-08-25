// apps/ngo/src/app/(app)/staff/tasks/page.tsx
import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseTask } from '@taila/core/types/task';
import { StaffTasksClient } from './StaffTasksClient';

export default async function StaffTasksPage() {
  const employee = await getCurrentEmployee();
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

  return <StaffTasksClient tasks={(data ?? []).map(parseTask)} />;
}