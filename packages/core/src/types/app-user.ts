// src/lib/types/app-user.ts
import { Database } from './database.types';
export type AppUserRow = Database['public']['Tables']['app_users']['Row'];
export type AppUser = AppUserRow;
export function parseAppUser(row: AppUserRow): AppUser { return row; }