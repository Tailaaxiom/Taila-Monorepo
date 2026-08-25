// src/lib/types/project.ts
import { Database } from './database.types';

export type ProjectRow = Database['public']['Tables']['projects']['Row'];

export interface Project extends ProjectRow {
  kind: 'project' | 'campaign';
}

export function parseProject(row: ProjectRow): Project {
  return { ...row, kind: row.kind === 'campaign' ? 'campaign' : 'project' };
}