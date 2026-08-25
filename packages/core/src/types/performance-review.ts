// src/lib/types/performance-review.ts
import { Database } from './database.types';
export type PerformanceReviewRow = Database['public']['Tables']['performance_reviews']['Row'];
export type PerformanceReview = PerformanceReviewRow;
export function parsePerformanceReview(row: PerformanceReviewRow): PerformanceReview { return row; }