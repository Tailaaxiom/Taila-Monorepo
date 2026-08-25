// apps/ngo/src/app/(app)/appointments/page.tsx
//
// Neutral top-level route, not nested under /leadership/ — this page is
// reached by finance, HOD, HR, leadership, and staff (confirmed against the
// real gating output, see 0008's own comment), not just leadership-adjacent
// roles. Gated to "not donor" rather than a specific list, matching
// appointments_write_by_staff (0008) exactly.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { AppointmentsClient, type AppointmentItem } from './AppointmentsClient';

export default async function AppointmentsPage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null;
  if (employee.role === 'donor') {
    return (
      <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
        <h1>Not permitted</h1>
        <p>Appointments isn't part of the donor portal.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('appointments')
    .select('id, title, description, location, start_time, end_time, attendees, created_by')
    .order('start_time', { ascending: true });

  if (error) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load appointments</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <AppointmentsClient
      orgId={employee.org_id}
      employeeName={employee.full_name}
      initialItems={(data ?? []) as AppointmentItem[]}
    />
  );
}