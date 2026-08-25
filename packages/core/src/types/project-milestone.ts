// src/lib/types/project-milestone.ts
import { Database } from './database.types';

export type ProjectMilestoneRow = Database['public']['Tables']['project_milestones']['Row'];

// project_id here is deliberately kept as a string, even though it points
// at projects.id (a number) — that's what's actually stored in production.
// Always compare with String(project.id), never a numeric ===, until this
// is normalized in the Phase 4 schema cleanup.
export type ProjectMilestone = ProjectMilestoneRow;

export function parseProjectMilestone(row: ProjectMilestoneRow): ProjectMilestone {
  return row;
}