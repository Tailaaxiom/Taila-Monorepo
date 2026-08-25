// src/lib/types/summary-report.ts
import { Database } from './database.types';
export type SummaryReportRow = Database['public']['Tables']['summary_reports']['Row'];
export type SummaryReport = SummaryReportRow;
export function parseSummaryReport(row: SummaryReportRow): SummaryReport { return row; }