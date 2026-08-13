-- Run this in the Supabase SQL editor (Database -> SQL Editor -> New query)

-- 1. Enable pgvector for embeddings-based features (documents, journal trends)
create extension if not exists vector;

-- 2. Core tables

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
  embedding vector(1024),  -- adjust dimension to match your chosen embedding model
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

-- 3. Row Level Security - each user can only ever touch their own rows.
-- Note: the backend currently uses the service_role key, which bypasses RLS
-- by design. RLS matters most once you expose Supabase directly to a
-- frontend (e.g. via supabase-js) using the anon key. Enabling it now is
-- still good practice and required if you ever add that path later.

alter table triage_history enable row level security;
alter table journal_entries enable row level security;
alter table documents enable row level security;
alter table medications enable row level security;

create policy "Users manage own triage history" on triage_history
  for all using (auth.uid() = user_id);

create policy "Users manage own journal entries" on journal_entries
  for all using (auth.uid() = user_id);

create policy "Users manage own documents" on documents
  for all using (auth.uid() = user_id);

create policy "Users manage own medications" on medications
  for all using (auth.uid() = user_id);

-- 4. Similarity search function for RAG (milestone 3)
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
