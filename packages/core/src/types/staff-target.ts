// src/lib/types/staff-target.ts
import { Database } from './database.types';
export type StaffTargetRow = Database['public']['Tables']['staff_targets']['Row'];
export type StaffTarget = StaffTargetRow;
export function parseStaffTarget(row: StaffTargetRow): StaffTarget { return row; }