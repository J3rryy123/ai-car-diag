-- Tabelle für den Diagnoseverlauf. Im Supabase-Dashboard unter "SQL Editor" ausführen.
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('diagnose', 'obd2', 'guided', 'multi')),
  customer text not null default '',
  note text not null default '',
  vehicle text not null default '',
  vin text not null default '',
  code text not null default '',
  problem text not null default '',
  data jsonb not null default '{}'::jsonb
);

create index if not exists cases_created_at_idx on public.cases (created_at desc);

-- Zugriff nur über den Service-Key der App (Server). Öffentlicher Zugriff bleibt gesperrt.
alter table public.cases enable row level security;
