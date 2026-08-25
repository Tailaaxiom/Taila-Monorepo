// src/lib/types/income.ts
import { Database } from './database.types';
export type IncomeRow = Database['public']['Tables']['income']['Row'];
export type Income = IncomeRow;
export function parseIncome(row: IncomeRow): Income { return row; }