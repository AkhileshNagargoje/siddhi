-- Atreya database setup (PROJECT.md data model)
-- Paste this whole file into Supabase SQL Editor and click Run.

-- 1. Tables ------------------------------------------------------

create table if not exists clinics (
  id text primary key,
  name text not null,
  sector int not null,
  type text not null default 'fixed',
  last_report_at timestamptz
);

create table if not exists encounters (
  id uuid primary key,
  ts timestamptz not null default now(),
  clinic_id text references clinics(id),
  sector int not null,
  age_band text not null,
  sex text not null,
  symptoms text[] not null default '{}',
  diagnosis text not null,
  syndrome text not null,
  drugs text[] not null default '{}',
  severity text not null default 'mild',
  risk_flags text[] not null default '{}',
  simulated boolean not null default false
);
create index if not exists idx_enc_ts on encounters (ts);
create index if not exists idx_enc_sector_syn_ts on encounters (sector, syndrome, ts);

create table if not exists baselines (
  sector int not null,
  syndrome text not null,
  mean_6h double precision not null default 0,
  stddev_6h double precision not null default 0,
  updated_at timestamptz not null default now(),
  primary key (sector, syndrome)
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  sector int not null,
  syndrome text not null,
  observed int not null,
  expected double precision not null,
  score double precision not null,
  tier text not null default 'watch',
  ts timestamptz not null default now(),
  status text not null default 'open'
);
create index if not exists idx_alerts_status on alerts (status);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid references alerts(id),
  assigned_unit text not null,
  created_at timestamptz not null default now(),
  ack_at timestamptz,
  resolved_at timestamptz,
  outcome text,
  note text
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid references encounters(id),
  risk_type text not null,
  qr_token text not null,
  home_district text,
  created_at timestamptz not null default now()
);

-- 2. Seed clinics ------------------------------------------------

insert into clinics (id, name, sector, type) values
  ('C01','Ramkund PHC',1,'fixed'),
  ('C02','Ramkund Mobile 1',1,'mobile'),
  ('C03','Tapovan Clinic',2,'fixed'),
  ('C04','Panchavati PHC',3,'fixed'),
  ('C05','Panchavati Mobile',3,'mobile'),
  ('C06','Gangapur Clinic',4,'fixed'),
  ('C07','Sadhugram East PHC',5,'fixed'),
  ('C08','Sadhugram East Mob.',5,'mobile'),
  ('C09','Sadhugram West PHC',6,'fixed'),
  ('C10','Trimbak Road Clinic',7,'fixed'),
  ('C11','Kushavarta PHC',8,'fixed'),
  ('C12','Kushavarta Mobile',8,'mobile'),
  ('C13','Nilparvat Clinic',9,'fixed'),
  ('C14','Anjaneri Camp Clinic',10,'fixed'),
  ('C15','Transit 1 PHC',11,'fixed'),
  ('C16','Transit 1 Mobile',11,'mobile'),
  ('C17','Transit 2 Clinic',12,'fixed')
on conflict (id) do nothing;

-- 3. Row-level security (permissive for hackathon demo) ----------
-- Demo software with fake data: anon key may read/write everything.

alter table clinics enable row level security;
alter table encounters enable row level security;
alter table baselines enable row level security;
alter table alerts enable row level security;
alter table tasks enable row level security;
alter table referrals enable row level security;

-- SELECT + INSERT + UPDATE only. Deliberately NOT `for all`, which includes
-- DELETE: this file used to grant it, so re-running setup.sql after harden.sql
-- ("let me just re-seed the clinics") silently handed the public key the
-- ability to erase the whole demo. The grants here now match harden.sql, so
-- the two files can be run in any order, any number of times.
do $$
declare t text;
begin
  foreach t in array array['clinics','encounters','baselines','alerts','tasks','referrals'] loop
    execute format('drop policy if exists demo_all on %I', t);
    execute format('create policy demo_read on %I for select to anon, authenticated using (true)', t);
    execute format('create policy demo_write on %I for insert to anon, authenticated with check (true)', t);
    execute format('create policy demo_edit on %I for update to anon, authenticated using (true) with check (true)', t);
  end loop;
exception when duplicate_object then null;
end $$;

-- 4. Realtime ----------------------------------------------------

-- Wrapped: re-adding a table already in the publication raises duplicate_object
-- and prints a red error that makes a perfectly good run look failed.
do $$
begin
  alter publication supabase_realtime add table encounters;
  alter publication supabase_realtime add table alerts;
  alter publication supabase_realtime add table tasks;
exception when duplicate_object then null;
end $$;
