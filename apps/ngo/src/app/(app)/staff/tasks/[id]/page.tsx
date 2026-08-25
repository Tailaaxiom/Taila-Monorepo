// apps/ngo/src/app/(app)/staff/tasks/[id]/page.tsx
import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseTask } from '@taila/core/types/task';
import { StaffTaskDetailClient } from './StaffTaskDetailClient';

export default async function StaffTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getCurrentEmployee();
  if (!employee) return null;

  const supabase = await createClient();
  // No org_id filter needed in the query itself — tasks_read_by_staff (0005)
  // already scopes this to the caller's org through RLS. A task id from a
  // different org simply returns no row here, not another org's data.
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load this task</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  return <StaffTaskDetailClient task={data ? parseTask(data) : null} />;
}