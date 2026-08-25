-- 0006_employees_self_read.sql
--
-- Real bug, found via a donor account that could sign in but never reached
-- any page. employees_read_org (0003) uses app.is_staff_of(), which
-- deliberately excludes donors — "Donors get no directory access at all"
-- was the intent, so a donor can't browse the staff list. The side effect
-- nobody caught: is_staff_of() is false for a donor regardless of WHOSE row
-- is being read, so it also blocked a donor from reading their own row.
--
-- getCurrentEmployee() (apps/ngo/src/lib/supabase/server.ts) queries
-- employees WHERE auth_user_id = auth.uid() through exactly this policy.
-- For a donor, that query silently returned zero rows even though the row
-- exists — RLS was hiding it, not the query being wrong. The app correctly
-- treats "no employee row found" as "not signed in" and redirects to
-- /sign-in. So a donor's password would be checked correctly, a real
-- session would be created, and the very next thing the app did was get
-- immediately bounced back to the sign-in form. Not a UI bug and not
-- anything wrong with the credentials — RLS was hiding the one row the
-- whole app depends on being able to read.
--
-- Fix: every employee, donor included, can always read their own row.
-- RLS policies for SELECT are OR'd together — a row is visible if ANY
-- applicable policy allows it — so this is purely additive. It does not
-- loosen employees_read_org at all: a donor still cannot browse anyone
-- else's row, still cannot see the directory. Only "is this MY row"
-- is added as an alternate path to visibility.

create policy employees_read_self
  on public.employees for select
  to authenticated
  using (auth_user_id = auth.uid());