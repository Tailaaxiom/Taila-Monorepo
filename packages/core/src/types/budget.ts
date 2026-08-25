// src/lib/types/expense.ts
import { Database } from './database.types';
export type ExpenseRow = Database['public']['Tables']['expenses']['Row'];
export type Expense = ExpenseRow;
export function parseExpense(row: ExpenseRow): Expense { return row; }