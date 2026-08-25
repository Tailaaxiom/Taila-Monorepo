// apps/ngo/src/app/(app)/leadership/tasks/page.tsx
import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseTask } from '@taila/core/types/task';
import { LeadershipTasksClient } from './LeadershipTasksClient';

export default async function LeadershipTasksPage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load tasks</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  return <LeadershipTasksClient orgId={employee.org_id} initialTasks={(data ?? []).map(parseTask)} />;
}