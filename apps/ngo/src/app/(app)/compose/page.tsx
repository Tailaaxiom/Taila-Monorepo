// apps/ngo/src/app/(app)/compose/page.tsx
//
// The shared entry point for the reporting chain (handover section 2):
// staff and HODs submit period reports, those roll up into what leadership
// reads. This page is the write side only — Submit Report and Summary
// Reports (the read/roll-up views) are separate, still-unbuilt pages that
// read the same summary_reports table (0010).
//
// Top-level route, not nested — reached by finance/hod/hr/leadership/staff,
// same reasoning as /appointments and /messages.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { ComposeReportClient, type SummaryReportItem } from './ComposeReportClient';

export default async function ComposeReportPage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null;
  if (employee.role === 'donor') {
    return (
      <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
        <h1>Not permitted</h1>
        <p>Compose Report isn't part of the donor portal.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('summary_reports')
    .select('id, author_name, department, period, content, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load reports</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <ComposeReportClient
      orgId={employee.org_id}
      employeeCode={employee.employee_code}
      employeeName={employee.full_name}
      department={employee.department}
      initialItems={(data ?? []) as SummaryReportItem[]}
    />
  );
}