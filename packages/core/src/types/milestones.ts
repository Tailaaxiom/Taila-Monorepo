// src/lib/projects/milestones.ts
// Faithful port of the legacy milestone engine's business rules
// (openMilestones, axMsSubmit/Verify/Return — index.html ~28071-28160).
import type { ProjectMilestone } from './project-milestone';

export function isMilestoneLocked(milestones: ProjectMilestone[], index: number): boolean {
  return milestones.slice(0, index).some((m) => m.status !== 'verified');
}

export interface MilestoneHealth {
  total: number;
  done: number;
  progressPct: number;
  onTimeRate: number;
  atRisk: boolean;
  overdueCount: number;
}

export function milestoneHealth(milestones: ProjectMilestone[]): MilestoneHealth {
  const today = new Date().toISOString().slice(0, 10);
  const total = milestones.length;
  const done = milestones.filter((m) => m.status === 'verified').length;
  const progressPct = total ? Math.round((done / total) * 100) : 0;

  const overdue = milestones.filter(
    (m) => m.status !== 'verified' && m.due_date && m.due_date.slice(0, 10) < today
  );

  const onTime = milestones.filter(
    (m) => m.status === 'verified' && m.due_date && m.verified_at && m.verified_at.slice(0, 10) <= m.due_date.slice(0, 10)
  ).length;
  const onTimeRate = done ? Math.round((onTime / done) * 100) : 0;

  return { total, done, progressPct, onTimeRate, atRisk: overdue.length > 0, overdueCount: overdue.length };
}

export function isMilestoneTargetMet(milestone: ProjectMilestone): boolean | null {
  if (milestone.actual_value == null || milestone.target_value == null) return null;
  return Number(milestone.actual_value) >= Number(milestone.target_value);
}