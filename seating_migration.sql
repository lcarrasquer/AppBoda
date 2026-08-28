-- ============================================
-- TABLAS DEL SEATING PLAN (Mesas e Invitados)
-- Copia y pega esto en Supabase > SQL Editor y pulsa Run
-- ============================================

create table if not exists seating_tables (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  table_number text not null,
  table_name text,
  capacity int default 10,
  shape text default 'round',
  pos_x numeric default 0,
  pos_y numeric default 0,
  rotation numeric default 0,
  notes text,
  position_order int default 0,
  created_at timestamptz default now()
);

create table if not exists seating_assignments (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  table_id uuid references seating_tables(id) on delete cascade not null,
  guest_name text not null,
  companion_names text,
  seats_count int default 1,
  dietary_requirements text,
  notes text,
  created_at timestamptz default now()
);

-- Habilitar seguridad (RLS)
alter table seating_tables enable row level security;
alter table seating_assignments enable row level security;

-- Políticas para seating_tables
create policy "owner_manage_seating_tables" on seating_tables for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "public_read_seating_tables" on seating_tables for select using (
  exists (select 1 from events e where e.id = event_id and e.status = 'active')
);

-- Políticas para seating_assignments
create policy "owner_manage_seating_assignments" on seating_assignments for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "public_read_seating_assignments" on seating_assignments for select using (
  exists (select 1 from events e where e.id = event_id and e.status = 'active')
);

-- ============================================
-- TABLA: seating_landmarks (Pistas de baile, barras, photocall, etc.)
-- ============================================
create table if not exists seating_landmarks (
  id text primary key,
  event_id uuid references events(id) on delete cascade not null,
  type text not null,
  name text not null,
  subtitle text,
  x numeric default 0,
  y numeric default 0,
  width numeric default 180,
  height numeric default 120,
  rotation numeric default 0,
  visible boolean default true,
  created_at timestamptz default now()
);

alter table seating_landmarks enable row level security;

create policy "owner_manage_seating_landmarks" on seating_landmarks for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "public_read_seating_landmarks" on seating_landmarks for select using (
  exists (select 1 from events e where e.id = event_id and e.status = 'active')
);

