// src/lib/types/platform-staff.ts
import { Database } from './database.types';

export type PlatformStaffRow = Database['public']['Tables']['platform_staff']['Row'];

export interface PlatformStaff extends Omit<PlatformStaffRow, 'sees_all'> {}

export function parsePlatformStaff(row: PlatformStaffRow): PlatformStaff {
  const { sees_all: _unused, ...rest } = row; // dead duplicate of see_all, never read anywhere
  return rest;
}