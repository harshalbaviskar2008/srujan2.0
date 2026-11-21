-- ==============================================================================
-- SmartClass IoT - Supabase Database Setup Script (ULTRA-FAST SYNC FIX)
-- Copy and paste this ENTIRE script into your Supabase SQL Editor and click "RUN"
-- ==============================================================================

-- 1. Create the sensor_readings table
create table if not exists public.sensor_readings (
  id bigint generated always as identity primary key,
  temperature numeric not null,
  humidity numeric not null,
  light numeric not null,
  air_quality numeric not null,
  classroom text default 'Room 302',
  created_at timestamptz default now()
);

-- 2. Add high-speed index for instant DESC queries (sub-millisecond lookups)
create index if not exists idx_sensor_readings_id_desc on public.sensor_readings (id desc);

-- 3. Set REPLICA IDENTITY FULL (forces Postgres to immediately broadcast full records via Realtime)
alter table public.sensor_readings replica identity full;

-- 4. Grant table and sequence permissions to anon and authenticated roles
grant all on table public.sensor_readings to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- 5. Enable Row Level Security (RLS)
alter table public.sensor_readings enable row level security;

-- 6. Drop old policies if they exist (to prevent duplicates)
drop policy if exists "Allow public read" on public.sensor_readings;
drop policy if exists "Allow public insert" on public.sensor_readings;
drop policy if exists "Allow public all" on public.sensor_readings;

-- 7. Create policy allowing anyone (anon) to READ data
create policy "Allow public read"
  on public.sensor_readings
  for select
  to anon, authenticated
  using (true);

-- 8. Create policy allowing anyone (anon) to INSERT data (from Wokwi or Web)
create policy "Allow public insert"
  on public.sensor_readings
  for insert
  to anon, authenticated
  with check (true);

-- 9. Enable Supabase Realtime for instant WebSocket updates
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'sensor_readings'
  ) then
    alter publication supabase_realtime add table public.sensor_readings;
  end if;
end $$;

-- 10. Insert initial seed data matching the reference dashboard photo
insert into public.sensor_readings (temperature, humidity, light, air_quality, classroom, created_at)
values
  (30.2, 61, 72, 405, 'Room 302', now() - interval '45 minutes'),
  (32.1, 59, 74, 395, 'Room 302', now() - interval '30 minutes'),
  (31.0, 65, 80, 412, 'Room 302', now() - interval '15 minutes'),
  (28.0, 60, 82, 422, 'Room 302', now());

-- Done! Your database is now tuned for ultra-low latency real-time synchronization (< 1 second).
