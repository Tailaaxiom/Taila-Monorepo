import { Database } from './database.types';

export type EmployeeRow = Database['public']['Tables']['employees']['Row'];

export interface Employee extends Omit<EmployeeRow, 'extra_roles' | 'extra_pages'> {
  extraRoles: string[];
  extraPages: string[];
}

// extra_roles and extra_pages are native text[] columns (0002) — confirmed
// directly against the real generated types, not assumed. The legacy
// comma-string / jsonb-string fallback this function used to carry (see
// docs/LEARNINGS.md) was removed here once that was verified rather than
// speculated.
export function parseEmployee(row: EmployeeRow): Employee {
  return {
    ...row,
    extraRoles: row.extra_roles,
    extraPages: row.extra_pages,
  };
}