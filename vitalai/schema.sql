-- ============================================================
-- VitalAI — Database Schema (idempotent: safe to re-run)
-- Run this in Supabase: Database → SQL Editor → New query
-- ============================================================

-- 1. Enable pgvector
create extension if not exists vector;

-- 2. Tables (all idempotent via IF NOT EXISTS)

create table if not exists triage_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  symptoms text not null,
  urgency text not null,
  reasoning text not null,
  created_at timestamptz default now()
);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  content text not null,
  embedding vector(1024),
  created_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  file_path text not null,
  chunk_text text not null,
  embedding vector(1024),
  created_at timestamptz default now()
);

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  dosage text,
  created_at timestamptz default now()
);

-- 3. Enable Row Level Security
alter table triage_history  enable row level security;
alter table journal_entries enable row level security;
alter table documents       enable row level security;
alter table medications     enable row level security;

-- 4. RLS Policies
--    DROP IF EXISTS first so this file is safe to re-run at any time.

drop policy if exists "Users manage own triage history" on triage_history;
create policy "Users manage own triage history" on triage_history
  for all using (auth.uid() = user_id);

drop policy if exists "Users manage own journal entries" on journal_entries;
create policy "Users manage own journal entries" on journal_entries
  for all using (auth.uid() = user_id);

drop policy if exists "Users manage own documents" on documents;
create policy "Users manage own documents" on documents
  for all using (auth.uid() = user_id);

drop policy if exists "Users manage own medications" on medications;
create policy "Users manage own medications" on medications
  for all using (auth.uid() = user_id);

-- 5. match_documents — vector similarity search for RAG (Milestone 3)
--    CREATE OR REPLACE makes this idempotent automatically.
create or replace function match_documents(
  query_embedding vector(1024),
  match_user_id uuid,
  match_count int default 5
)
returns table (id uuid, chunk_text text, similarity float)
language sql stable
as $$
  select id, chunk_text, 1 - (embedding <=> query_embedding) as similarity
  from documents
  where user_id = match_user_id
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 6. appointments table (Phase F — Care Coordination)
create table if not exists appointments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users not null,
  provider_name    text not null,
  appointment_date timestamptz not null,
  reason           text not null,
  notes            text,
  created_at       timestamptz default now()
);

alter table appointments enable row level security;

drop policy if exists "Users manage own appointments" on appointments;
create policy "Users manage own appointments" on appointments
  for all using (auth.uid() = user_id);

-- 7. agent_insights — cache for Phase H Proactive AI Agent
create table if not exists agent_insights (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  insights_json jsonb not null,
  generated_at timestamptz default now()
);

alter table agent_insights enable row level security;

drop policy if exists "Users manage own agent insights" on agent_insights;
create policy "Users manage own agent insights" on agent_insights
  for all using (auth.uid() = user_id);

-- 8. care_circle table & Caregiver RLS policies (Phase I — Caregiver / Family Sharing)
create table if not exists care_circle (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid references auth.users not null,
  invited_email   text not null,
  invited_user_id uuid references auth.users,
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  permissions     text not null default 'view_summary',
  created_at      timestamptz default now()
);

alter table care_circle enable row level security;

drop policy if exists "Users and invited manage care_circle" on care_circle;
create policy "Users and invited manage care_circle" on care_circle
  for all using (
    auth.uid() = owner_user_id
    or auth.uid() = invited_user_id
    or lower(auth.jwt()->>'email') = lower(invited_email)
  );

-- Extended SELECT policies for Caregiver sharing (excludes raw journal_entries & documents)
drop policy if exists "Caregivers view shared triage history" on triage_history;
create policy "Caregivers view shared triage history" on triage_history
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from care_circle
      where care_circle.owner_user_id = triage_history.user_id
        and (care_circle.invited_user_id = auth.uid() or lower(care_circle.invited_email) = lower(auth.jwt()->>'email'))
        and care_circle.status = 'accepted'
    )
  );

drop policy if exists "Caregivers view shared medications" on medications;
create policy "Caregivers view shared medications" on medications
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from care_circle
      where care_circle.owner_user_id = medications.user_id
        and (care_circle.invited_user_id = auth.uid() or lower(care_circle.invited_email) = lower(auth.jwt()->>'email'))
        and care_circle.status = 'accepted'
    )
  );

drop policy if exists "Caregivers view shared appointments" on appointments;
create policy "Caregivers view shared appointments" on appointments
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from care_circle
      where care_circle.owner_user_id = appointments.user_id
        and (care_circle.invited_user_id = auth.uid() or lower(care_circle.invited_email) = lower(auth.jwt()->>'email'))
        and care_circle.status = 'accepted'
    )
  );

