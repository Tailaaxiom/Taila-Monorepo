-- 0009_messages.sql
--
-- Direct messages between two org members (handover nav id p-messages).
-- Reachable by every NGO role including donor (checked against the real
-- gating output: NAVMAP.donor carries p-messages, unlike p-appointments,
-- which explicitly does not) — a donor is a full participant here, not
-- excluded or opt-in like Fund Utilization/Media Library.
--
-- recipient_code is free-text employee_code, same pattern as tasks.assignee
-- (0005) and appointments.attendees (0008) — not a foreign key.
--
-- sender_code/sender_name is a denormalized pair, same shape as
-- media.uploaded_by_code/uploaded_by_name (0007) — set once at insert from
-- the caller's own session, never resolved via a join. This matters more
-- here than anywhere else it's been used so far: donors have no directory
-- read (employees_read_org, 0003, denies them), so a donor receiving a
-- message from staff has no other way to learn who it's from.

create table public.messages (
  id             text primary key default ('msg_' || replace(gen_random_uuid()::text, '-', '')),
  org_id         text not null references public.organizations(id) on delete cascade,
  sender_code    text not null,
  sender_name    text not null,
  recipient_code text not null,
  body           text not null,
  -- Optional "this is about X" tag (task, project, funder, ...) — see
  -- packages/core/src/types/message.ts's MessageRef. Nullable and not yet
  -- populated by any UI; no picker exists yet, same trade-off already made
  -- for tasks' geofence fields (0005).
  refs           jsonb,
  created_at     timestamptz not null default now()
);

create index messages_org_idx           on public.messages (org_id);
create index messages_org_sender_idx    on public.messages (org_id, sender_code);
create index messages_org_recipient_idx on public.messages (org_id, recipient_code);

-- No updated_at, no touch/freeze triggers, no update or delete policy:
-- messages are immutable once sent. There is no edit/unsend/read-receipt
-- feature in this v1 — a message row never changes after insert.

alter table public.messages enable row level security;
alter table public.messages force row level security;

-- Visibility is scoped to conversation participation, not org-wide like
-- tasks/appointments (0005/0008) — a private message readable by every
-- colleague would defeat the point of the feature, so unlike those two
-- tables this is not a deferred v1 gap, it's the correct rule from the
-- start. org_id = app.org_id() (rather than app.is_staff_of(org_id), which
-- excludes donors) is deliberate: a donor has an active employees row like
-- anyone else (0003), and is meant to be reachable here.
create policy messages_read_participant
  on public.messages for select
  to authenticated
  using (
    org_id = app.org_id()
    and (sender_code = app.employee_code() or recipient_code = app.employee_code())
  );

-- Sender identity is asserted by the database, not trusted from the client:
-- sender_code must equal the caller's own employee_code, so nobody can send
-- a message that appears to come from someone else.
create policy messages_insert_by_participant
  on public.messages for insert
  to authenticated
  with check (
    org_id = app.org_id()
    and sender_code = app.employee_code()
  );
