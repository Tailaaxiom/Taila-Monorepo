// apps/ngo/src/app/(app)/messages/page.tsx
//
// Neutral top-level route, not nested under /leadership/ — reached by every
// NGO role, donor included (confirmed against the real gating output:
// NAVMAP.donor carries p-messages, unlike p-appointments). No role check
// needed here as a result — every signed-in employee is a valid participant.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { MessagesClient, type MessageItem } from './MessagesClient';

export default async function MessagesPage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_code, sender_name, recipient_code, body, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load messages</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <MessagesClient
      orgId={employee.org_id}
      employeeCode={employee.employee_code}
      employeeName={employee.full_name}
      initialItems={(data ?? []) as MessageItem[]}
    />
  );
}
