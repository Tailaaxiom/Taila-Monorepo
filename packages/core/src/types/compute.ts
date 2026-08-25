// src/lib/kpi/compute.ts
// Faithful port of axKpiWindowStart / axKpiActual (index.html ~27963-27990).
import type { StaffKpi, KpiCadence } from './staff-kpi';
import type { Task } from './task';
import type { Activity } from './activity';
import type { WorkSession } from '../kpi/sessions'

export function kpiWindowStart(cadence: KpiCadence | null): Date {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  if (cadence === 'daily') return d;
  if (cadence === 'weekly') {
    const wd = (n.getDay() + 6) % 7; // Monday-start week
    const m = new Date(d);
    m.setDate(d.getDate() - wd);
    return m;
  }
  if (cadence === 'monthly') return new Date(n.getFullYear(), n.getMonth(), 1);
  if (cadence === 'quarterly') {
    const q = Math.floor(n.getMonth() / 3) * 3;
    return new Date(n.getFullYear(), q, 1);
  }
  return new Date(0); // all time
}

export function computeKpiActual(kpi: StaffKpi, tasks: Task[], activities: Activity[], sessions: WorkSession[]): number {
  const start = kpiWindowStart(kpi.cadence);
  const startStr = start.toISOString().slice(0, 10);

  switch (kpi.metric) {
    case 'tasks_done':
      return tasks.filter((t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= start).length;
    case 'activities':
      return activities.filter((a) => a.activity_date && a.activity_date.slice(0, 10) >= startStr).length;
    case 'hours':
      return Math.round(sessions.filter((s) => s.start >= start).reduce((sum, s) => sum + (s.hours || 0), 0) * 10) / 10;
    case 'ontime': {
      const done = tasks.filter((t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= start);
      if (!done.length) return 0;
      const onTime = done.filter((t) => t.due && (t.completed_at ?? '').slice(0, 10) <= t.due.slice(0, 10)).length;
      return Math.round((onTime / done.length) * 100);
    }
    case 'tasks_assigned':
      return tasks.filter((t) => t.created_at && new Date(t.created_at) >= start).length;
    case 'beneficiaries':
      return activities
        .filter((a) => a.activity_date && a.activity_date.slice(0, 10) >= startStr)
        .reduce((sum, a) => sum + (Number(a.beneficiaries) || 0), 0);
    default:
      return 0;
  }
}