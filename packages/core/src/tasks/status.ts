import type { Task } from '../types/task';

export function statusBadge(status: Task['status']): { label: string; variant: 'green' | 'gold' | 'red' | 'blue' | 'muted' } {
  switch (status) {
    case 'done': return { label: 'Done', variant: 'green' };
    case 'in_progress': return { label: 'In progress', variant: 'gold' };
    case 'blocked': return { label: 'Blocked', variant: 'red' };
    case 'submitted': return { label: 'Submitted', variant: 'blue' };
    default: return { label: status ?? 'Pending', variant: 'muted' };
  }
}