-- 0015_approvals_review.sql
--
-- Closes the gap 0012's own comment named explicitly: "there is no review
-- flow in this pass ... nothing can move a request out of 'pending' yet".
-- This adds exactly that — an UPDATE policy so a leadership/finance/admin
-- account can approve or reject a request. This is the write side of the
-- new /leadership/approvals page (p-lead-approvals — "Approvals" for
-- leadership, "Disbursement Queue" for finance, same route).
--
-- Same limitation already accepted for project_milestones_write_by_staff
-- (0005): a plain role-based UPDATE policy can't distinguish "approve/
-- reject this request" from "edit any other column on it" — a real gap,
-- not solved here with a trigger or column-level check. Stated plainly
-- rather than implied covered.
--
-- reviewed_by stores the reviewer's full name, not a code. Unlike
-- requester_code/requester_name or sender_code/sender_name elsewhere in
-- this project, approvals has a single reviewed_by column with no paired
-- name column — the closer precedent is expenses.created_by (0005), which
-- already stores a name directly for the same reason: nothing else on
-- this table can resolve a code back to a display name for the reviewer.

create policy approvals_update_by_finance
  on public.approvals for update
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership', 'finance', 'admin'))
  with check (app.is_staff_of(org_id) and app.role() in ('leadership', 'finance', 'admin'));
