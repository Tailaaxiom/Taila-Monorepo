// src/lib/types/programme.ts
import { Database } from './database.types';
export type ProgrammeRow = Database['public']['Tables']['programmes']['Row'];
export type Programme = ProgrammeRow;
export function parseProgramme(row: ProgrammeRow): Programme { return row; }