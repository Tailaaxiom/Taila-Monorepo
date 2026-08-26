'use client';

// Deliberately plain, same reasoning as Task Manager (leadership/tasks) and
// every other functional page this project. See docs/INTERFACE.md, on hold.
//
// Scope note, same as leadership/tasks: geofence fields aren't in this
// form — no map picker exists yet.
//
// Every task created here also writes a row to activity_events (0011) —
// this is one of the two write paths in the HOD workspace that gives
// Dept Feed and Access Log real content, per the batch's own design note.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import { parseTask, type Task } from '@taila/core/types/task';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { statusBadge } from '@taila/core/tasks/status';

const PROOF_OPTIONS = ['photo', 'document', 'reading'] as const;

export function HodTasksClient({
  orgId,
  department,
  employeeCode,
  employeeName,
  employeeRole,
  initialTasks,
}: {
  orgId: string;
  department: string;
  employeeCode: string;
  employeeName: string;
  employeeRole: string;
  initialTasks: Task[];
}) {
  usePageTitle('Tasks');

  const [tasks, setTasks] = useState(initialTasks);
  const [proofRequired, setProofRequired] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleProof(p: string) {
    setProofRequired((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function refreshList() {
    const supabase = createClient();
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('dept', department)
      .order('created_at', { ascending: false });
    if (data) setTasks(data.map(parseTask));
  }

  async function handleAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const title = form.get('title') as string;
    const deliverablesRaw = (form.get('deliverables') as string) ?? '';
    const deliverables = deliverablesRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const dueRaw = form.get('due') as string;

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('tasks').insert({
      org_id: orgId,
      title,
      assignee: (form.get('assignee') as string) || null,
      dept: department,
      priority: (form.get('priority') as string) || 'normal',
      due: dueRaw ? new Date(dueRaw).toISOString() : null,
      deliverables_json: deliverables.length > 0 ? JSON.stringify(deliverables) : null,
      proof_required: proofRequired.length > 0 ? proofRequired.join(',') : null,
    });

    if (error) {
      setSubmitting(false);
      setFormError(error.message);
      return;
    }

    // Best-effort: a failed event log doesn't undo the task that was just
    // created, same reasoning as media's orphan-file note — the task write
    // already succeeded and is the thing that matters.
    await supabase.from('activity_events').insert({
      org_id: orgId,
      department,
      user_code: employeeCode,
      user_name: employeeName,
      role: employeeRole,
      event_type: 'task_created',
      entity_type: 'task',
      summary: `${employeeName} created a task: ${title}`,
    });

    setSubmitting(false);
    (e.target as HTMLFormElement).reset();
    setProofRequired([]);
    await refreshList();
  }

  return (
    <div className="space-y-4">
      <Card title="Add task">
        <form
          onSubmit={handleAddTask}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, fontFamily: 'sans-serif' }}
        >
          <label style={{ gridColumn: '1 / -1' }}>
            Title
            <input name="title" required style={{ width: '100%' }} />
          </label>
          <label>
            Assignee (employee code)
            <input name="assignee" placeholder="e.g. KDI-1043" />
          </label>
          <label>
            Department
            <input value={department} disabled style={{ width: '100%' }} />
          </label>
          <label>
            Priority
            <select name="priority" defaultValue="normal">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Due date
            <input name="due" type="date" />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Deliverables (one per line)
            <textarea name="deliverables" rows={3} style={{ width: '100%' }} />
          </label>

          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{ marginBottom: 4 }}>Proof required</p>
            {PROOF_OPTIONS.map((p) => (
              <label key={p} style={{ display: 'inline-block', marginRight: 16, fontWeight: 400 }}>
                <input type="checkbox" checked={proofRequired.includes(p)} onChange={() => toggleProof(p)} /> {p}
              </label>
            ))}
          </div>

          {formError && <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{formError}</p>}

          <button type="submit" disabled={submitting} style={{ gridColumn: '1 / -1' }}>
            {submitting ? 'Adding…' : 'Add task'}
          </button>
        </form>
      </Card>

      <Card title="Department tasks" subtitle={`${tasks.length} in ${department}`}>
        {tasks.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No tasks recorded for this department yet.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Task</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Assignee</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const badge = statusBadge(task.status);
                return (
                  <tr key={task.id}>
                    <td className="py-[0.68rem] text-[0.71rem] text-white border-b border-border/60">{task.title}</td>
                    <td className="py-[0.68rem] text-[0.71rem] text-muted2 border-b border-border/60">{task.assignee ?? '—'}</td>
                    <td className="py-[0.68rem] border-b border-border/60"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
