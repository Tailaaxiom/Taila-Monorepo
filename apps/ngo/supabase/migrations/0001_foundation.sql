-- 0001_foundation.sql
-- Extensions, the private `app` schema, and shared triggers.
--
-- Everything security-related lives in `app`, never in `public`. Nothing in
-- `app` is directly readable by clients; they only get EXECUTE on the specific
-- helper functions granted in 0003.

create extension if not exists pgcrypto;

create schema if not exists app;

-- Clients never select from app.*; they only call granted functions.
revoke all on schema app from public;
grant usage on schema app to authenticated, anon;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
-- Applied as a trigger on every table carrying updated_at, so the column is
-- never the application's responsibility and cannot drift.

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tenant key immutability
-- ---------------------------------------------------------------------------
-- org_id is the tenant boundary. RLS stops a client writing a row into another
-- org, but a client with a legitimate row could otherwise UPDATE its org_id and
-- push it across the boundary. This blocks that at the table level, so the
-- protection does not depend on every policy being written perfectly.

create or replace function app.freeze_org_id()
returns trigger
language plpgsql
as $$
begin
  if new.org_id is distinct from old.org_id then
    raise exception 'org_id is immutable (attempted % -> %)', old.org_id, new.org_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on schema app is
  'Private helpers: auth context accessors and triggers. Not client readable.';
