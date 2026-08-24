-- Atreya — pharmacy signal.
--
-- HOW TO RUN: Supabase SQL Editor, click into the editor, highlight nothing,
-- paste this whole file, Run. Read the check at the bottom.
--   https://supabase.com/dashboard/project/ommnjuedmzffiawhkdqi/sql/new
--
-- WHY
--   People self-medicate before they see a doctor. A spike in ORS and
--   anti-diarrhoeal sales therefore leads clinic cases by hours — it catches
--   the people who never reach a clinic at all, which is the surveillance
--   system's largest blind spot.
--
--   This is a genuinely INDEPENDENT signal: different reporters (stall
--   keepers, not clinicians), different act (a purchase, not a consultation),
--   different failure modes. Two independent signals agreeing is evidence in
--   a way that one signal shouting twice is not.

-- 1. Raw tallies -------------------------------------------------------------
-- One row per stall per shift per item. Deliberately coarse: a stall keeper
-- taps a count, they do not run a point-of-sale system.

create table if not exists pharmacy_sales (
  id uuid primary key,
  ts timestamptz not null default now(),
  sector int not null,
  stall_id text not null,
  item text not null,          -- ors | zinc | antidiarrheal | paracetamol | orsyp
  qty int not null,
  simulated boolean not null default false
);
create index if not exists idx_pharm_ts on pharmacy_sales (ts);
create index if not exists idx_pharm_sector_ts on pharmacy_sales (sector, ts);

-- 2. Computed signal ---------------------------------------------------------
-- The engine writes one row per sector per scan: how much rehydration product
-- moved in the last 6h against what that sector's own history says is normal.
-- Same window, same phase-matched baseline, same scoring function as clinical
-- detection — so the two numbers are directly comparable.

create table if not exists pharmacy_signals (
  sector int primary key,
  observed int not null default 0,
  expected double precision not null default 0,
  score double precision not null default 0,
  elevated boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 3. Stalls ------------------------------------------------------------------
-- Two per sector, mirroring the clinic layout closely enough to be plausible.

create table if not exists pharmacy_stalls (
  id text primary key,
  name text not null,
  sector int not null
);

insert into pharmacy_stalls (id, name, sector) values
  ('P01','Ramkund Medical Stall',1),      ('P02','Ramkund Chemist',1),
  ('P03','Tapovan Medical Stall',2),      ('P04','Panchavati Chemist',3),
  ('P05','Panchavati Medical',3),         ('P06','Gangapur Chemist',4),
  ('P07','Sadhugram East Chemist',5),     ('P08','Sadhugram East Stall',5),
  ('P09','Sadhugram West Chemist',6),     ('P10','Trimbak Road Chemist',7),
  ('P11','Kushavarta Chemist',8),         ('P12','Kushavarta Stall',8),
  ('P13','Nilparvat Chemist',9),          ('P14','Anjaneri Camp Stall',10),
  ('P15','Transit 1 Chemist',11),         ('P16','Transit 1 Stall',11),
  ('P17','Transit 2 Chemist',12)
on conflict (id) do nothing;

-- 4. Access ------------------------------------------------------------------
-- Same posture as the rest of the schema after harden.sql: read, insert and
-- update for the public key; no delete.

alter table pharmacy_sales   enable row level security;
alter table pharmacy_signals enable row level security;
alter table pharmacy_stalls  enable row level security;

drop policy if exists demo_read   on pharmacy_sales;
drop policy if exists demo_write  on pharmacy_sales;
drop policy if exists demo_update on pharmacy_sales;
create policy demo_read   on pharmacy_sales for select to anon, authenticated using (true);
create policy demo_write  on pharmacy_sales for insert to anon, authenticated with check (true);
create policy demo_update on pharmacy_sales for update to anon, authenticated using (true) with check (true);

drop policy if exists demo_read   on pharmacy_signals;
drop policy if exists demo_write  on pharmacy_signals;
drop policy if exists demo_update on pharmacy_signals;
create policy demo_read   on pharmacy_signals for select to anon, authenticated using (true);
create policy demo_write  on pharmacy_signals for insert to anon, authenticated with check (true);
create policy demo_update on pharmacy_signals for update to anon, authenticated using (true) with check (true);

drop policy if exists demo_read   on pharmacy_stalls;
drop policy if exists demo_write  on pharmacy_stalls;
drop policy if exists demo_update on pharmacy_stalls;
create policy demo_read   on pharmacy_stalls for select to anon, authenticated using (true);
create policy demo_write  on pharmacy_stalls for insert to anon, authenticated with check (true);
create policy demo_update on pharmacy_stalls for update to anon, authenticated using (true) with check (true);

-- 5. Live updates ------------------------------------------------------------
-- Wrapped: re-running the file must not fail on "already a member".

do $$
begin
  begin execute 'alter publication supabase_realtime add table pharmacy_sales';
  exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table pharmacy_signals';
  exception when duplicate_object then null; end;
end $$;

-- CHECK ----------------------------------------------------------------------
select
  (select count(*) from pharmacy_stalls)  as stalls,
  (select count(*) from pharmacy_sales)   as sales_rows,
  (select count(*) from pharmacy_signals) as signal_rows;

-- Expect: stalls 17, and the two counts at 0 until the engine starts writing.
