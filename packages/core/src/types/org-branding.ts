// src/lib/types/org-branding.ts
import { Database } from './database.types';
export type OrgBrandingRow = Database['public']['Tables']['org_branding']['Row'];
export type OrgBranding = OrgBrandingRow;
export function parseOrgBranding(row: OrgBrandingRow): OrgBranding { return row; }