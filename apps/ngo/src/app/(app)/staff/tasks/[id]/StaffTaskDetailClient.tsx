// apps/ngo/src/app/(app)/staff/tasks/[id]/StaffTaskDetailClient.tsx
'use client';

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import type { Task } from '@taila/core/types/task';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { statusBadge } from '@taila/core/tasks/status';

export function StaffTaskDetailClient({ task }: { task: Task | null }) {
  usePageTitle(task ? task.title : 'Task not found');

  // Local-only for now: stands in for the real submit-to-Supabase call that
  // arrives in a later phase (a real task_events / submission table).
  // Unchanged from before this page was wired to real data — only the task
  // itself is now real, the submit interaction still isn't. See
  // docs/EXECUTION.md.
  const [checked, setChecked] = useState<string[]>(task?.deliverablesDone ?? []);
  const [proofAttached, setProofAttached] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!task) {
    return <Card><p className="text-muted text-sm">This task could not be found.</p></Card>;
  }

  const badge = statusBadge(task.status);
  const allDeliverablesDone = task.deliverables.every((d) => checked.includes(d));
  const allProofAttached = task.proofRequired.every((p) => proofAttached[p]);
  const canSubmit = allDeliverablesDone && allProofAttached && !submitted && task.status !== 'blocked';

  const toggleDeliverable = (item: string) => {
    setChecked((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  return (
    <div className="space-y-3 max-w-2xl">
      <Card>
        <div className="flex justify-between items-start gap-3 mb-3">
          <div>
            <div className="text-[0.9rem] font-medium text-white">{task.title}</div>
            {task.descr && <div className="text-[0.7rem] text-muted mt-[0.3rem] leading-relaxed">{task.descr}</div>}
          </div>
          <Badge variant={submitted ? 'blue' : badge.variant}>{submitted ? 'Submitted' : badge.label}</Badge>
        </div>
        {task.due && (
          <div className="text-[0.6rem] text-muted">
            Due {new Date(task.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        )}
      </Card>

      {task.status === 'blocked' && (
        <Card title="Blocked">
          <p className="text-[0.72rem] text-red">{task.blocked_reason ?? 'No reason given.'}</p>
          {task.blocked_at && (
            <p className="text-[0.6rem] text-muted mt-1">
              Since {new Date(task.blocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </Card>
      )}

      {task.deliverables.length > 0 && (
        <Card title="Deliverables">
          <ul className="space-y-2">
            {task.deliverables.map((item) => {
              const done = checked.includes(item);
              return (
                <li key={item}>
                  <button
                    onClick={() => toggleDeliverable(item)}
                    disabled={submitted || task.status === 'blocked'}
                    className="flex items-center gap-2 text-[0.72rem] w-full text-left disabled:opacity-60"
                  >
                    <span className={done ? 'text-green' : 'text-muted2'}>{done ? '✓' : '○'}</span>
                    <span className={done ? 'text-white' : 'text-muted2'}>{item}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {task.proofRequired.length > 0 && (
        <Card title="Proof required before this can be handed in">
          <div className="space-y-2">
            {task.proofRequired.map((p) => {
              const attached = proofAttached[p];
              return (
                <div key={p} className="flex items-center justify-between">
                  <Badge variant="gold">{p}</Badge>
                  <button
                    onClick={() => setProofAttached((prev) => ({ ...prev, [p]: !prev[p] }))}
                    disabled={submitted || task.status === 'blocked'}
                    className={`text-[0.62rem] px-2 py-1 border transition-colors disabled:opacity-60 ${
                      attached ? 'border-green text-green' : 'border-border2 text-muted hover:border-white hover:text-white'
                    }`}
                  >
                    {attached ? 'Attached ✓' : `Attach ${p}`}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {task.geofenceLabel && task.geofenceLat != null && task.geofenceLng != null && (
        <Card title="Location">
          <div className="text-[0.72rem] text-white">{task.geofenceLabel}</div>
          <a
            href={`https://www.google.com/maps?q=${task.geofenceLat},${task.geofenceLng}`}
            target="_blank"
            rel="noopener"
            className="text-[0.68rem] text-gold underline mt-1 inline-block"
          >
            View on map
          </a>
        </Card>
      )}

      {task.status !== 'blocked' && (
        <button
          onClick={() => setSubmitted(true)}
          disabled={!canSubmit}
          className="w-full py-[0.72rem] bg-gold text-bg text-[0.68rem] font-semibold tracking-[0.14em] uppercase transition-colors hover:bg-gold-light disabled:bg-border2 disabled:text-muted disabled:cursor-not-allowed"
        >
          {submitted ? 'Submitted for review' : 'Submit task'}
        </button>
      )}
    </div>
  );
}