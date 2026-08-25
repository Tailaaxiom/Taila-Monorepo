import { Database } from './database.types';

export type OrganizationRow = Database['public']['Tables']['organizations']['Row'];

export interface Organization extends Omit<OrganizationRow, 'modules'> {
  modules: string[] | null; // null = sector defaults apply; array = explicit override
}

export function parseOrganization(row: OrganizationRow): Organization {
  return {
    ...row,
    modules: parseModules(row.modules),
  };
}

function parseModules(value: unknown): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}