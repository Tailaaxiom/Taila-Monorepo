// src/lib/types/org-targets.ts
import { Database } from './database.types';
export type OrgTargetsRow = Database['public']['Tables']['targets']['Row'];
export type OrgTargets = OrgTargetsRow;
export function parseOrgTargets(row: OrgTargetsRow): OrgTargets { return row; }
// Flag for later: this table is one fixed row per org (isOneToOne FK), with
// five hardcoded NGO-specific metric columns (activities, beneficiaries,
// field_visits, media_outputs, trainings). It has no way to represent an
// org-level annual target for a manufacturing or real-estate org — "units
// produced" or "properties sold" simply don't fit this schema. Worth
// raising for the Phase 4 schema cleanup: either generalize this to a
// flexible metric/value structure (matching staff_kpis' freeform design),
// or accept it stays NGO/humanitarian-only as a deliberate scope limit.