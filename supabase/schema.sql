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

-- Benutzerverwaltung: Konten für die Anmeldung (Passwörter nur als scrypt-Hash).
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  display_name text not null default '',
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  active boolean not null default true
);

alter table public.app_users enable row level security;

-- Wer hat den Fall angelegt? (Anzeigename zum Zeitpunkt der Erstellung)
alter table public.cases add column if not exists created_by text not null default '';

-- Sichtbarkeit: Mitarbeiter sehen nur eigene Fälle (Administratoren alle).
-- Ältere Fälle ohne Zuordnung sind nur für Administratoren sichtbar.
alter table public.cases add column if not exists created_by_id uuid references public.app_users (id) on delete set null;
create index if not exists cases_created_by_id_idx on public.cases (created_by_id);

-- Zentrale Begrenzung von Anfragen (Schutz der KI-Zugänge und der Anmeldung), gilt auch bei mehreren Server-Instanzen.
-- Feste Zeitfenster je Schlüssel; die App ruft die Funktion rate_limit_hit über den Service-Key auf.
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;

create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / greatest(p_window_seconds, 1)) * greatest(p_window_seconds, 1));
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (left(p_key, 200), v_start, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- gelegentlich alte Fenster aufräumen
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits;
end;
$$;

-- Nur die App (Service-Key) darf zählen, nicht der öffentliche Zugriff
revoke all on function public.rate_limit_hit(text, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer) to service_role;
