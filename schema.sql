-- ============================================
-- EXTENSIONES
-- ============================================
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLA: events (bodas)
-- ============================================
create table events (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) not null,
  slug text unique not null,              -- usado en la URL del QR: /e/{slug}
  bride_name text not null,
  groom_name text not null,
  event_date date not null,
  location text,
  wifi_ssid text,
  wifi_password text,
  primary_color text default '#D4AF37',
  logo_url text,
  watermark_url text,
  pin_code text,                          -- PIN opcional de 4 dígitos
  pin_enabled boolean default false,
  plan text default 'basic' check (plan in ('basic','premium')),
  status text default 'draft' check (status in ('draft','active','closed','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TABLA: event_modules (funcionalidades activables por evento)
-- ============================================
create table event_modules (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  module_key text not null check (module_key in ('photos', 'kahoot')),
  is_enabled boolean default false,
  sort_order int default 0,
  created_at timestamptz default now(),
  unique(event_id, module_key)
);

-- ============================================
-- TABLA: photo_tags (etiquetas del módulo Fotos)
-- ============================================
create table photo_tags (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: challenges (retos del módulo Fotos)
-- ============================================
create table challenges (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  title text not null,
  description text,
  icon text,
  target_photo_count int default 1,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: guests (participantes de un evento)
-- ============================================
create table guests (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  user_id uuid references auth.users(id),   -- null si viene del Flujo B (anónimo)
  full_name text not null,
  created_at timestamptz default now()
);
create unique index guests_event_user_unique on guests(event_id, user_id) where user_id is not null;

-- ============================================
-- TABLA: photos
-- ============================================
create table photos (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  guest_id uuid references guests(id) on delete cascade not null,
  challenge_id uuid references challenges(id),
  storage_path text not null,             -- ruta en Supabase Storage
  watermarked_path text,
  is_hidden boolean default false,
  likes_count int default 0,
  created_at timestamptz default now()
);
create index idx_photos_event on photos(event_id);
create index idx_photos_challenge on photos(challenge_id);

-- ============================================
-- TABLA: photo_tag_assignments (relación N:M)
-- ============================================
create table photo_tag_assignments (
  photo_id uuid references photos(id) on delete cascade not null,
  tag_id uuid references photo_tags(id) on delete cascade not null,
  primary key (photo_id, tag_id)
);

-- ============================================
-- TABLA: photo_likes
-- ============================================
create table photo_likes (
  id uuid primary key default uuid_generate_v4(),
  photo_id uuid references photos(id) on delete cascade not null,
  guest_id uuid references guests(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(photo_id, guest_id)
);

-- ============================================
-- TABLA: photo_comments
-- ============================================
create table photo_comments (
  id uuid primary key default uuid_generate_v4(),
  photo_id uuid references photos(id) on delete cascade not null,
  guest_id uuid references guests(id) not null,
  content text not null,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: guestbook_entries (libro de visitas)
-- ============================================
create table guestbook_entries (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  guest_id uuid references guests(id) not null,
  type text not null check (type in ('text','audio')),
  content text,
  audio_path text,
  duration_seconds int,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: event_schedule (cronograma)
-- ============================================
create table event_schedule (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  title text not null,
  scheduled_time time not null,
  sort_order int default 0
);

-- ============================================
-- TABLAS KAHOOT
-- ============================================
create table kahoot_quizzes (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  title text not null,
  prize_description text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table kahoot_questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references kahoot_quizzes(id) on delete cascade not null,
  question_text text not null,
  image_url text,
  points int default 10,
  sort_order int default 0
);

create table kahoot_answers (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid references kahoot_questions(id) on delete cascade not null,
  answer_text text not null,
  is_correct boolean default false,
  sort_order int default 0
);

create table kahoot_attempts (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references kahoot_quizzes(id) on delete cascade not null,
  guest_id uuid references guests(id) on delete cascade not null,
  score int default 0,
  started_at timestamptz default now(),
  completed_at timestamptz,
  unique(quiz_id, guest_id)
);

create table kahoot_responses (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid references kahoot_attempts(id) on delete cascade not null,
  question_id uuid references kahoot_questions(id) not null,
  answer_id uuid references kahoot_answers(id) not null,
  is_correct boolean not null,
  created_at timestamptz default now(),
  unique(attempt_id, question_id)
);

create view kahoot_leaderboard as
select
  a.quiz_id,
  a.guest_id,
  g.full_name,
  a.score,
  a.completed_at
from kahoot_attempts a
join guests g on g.id = a.guest_id
where a.completed_at is not null
order by a.score desc, a.completed_at asc;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
alter table events enable row level security;
alter table event_modules enable row level security;
alter table photo_tags enable row level security;
alter table photo_tag_assignments enable row level security;
alter table challenges enable row level security;
alter table guests enable row level security;
alter table photos enable row level security;
alter table photo_likes enable row level security;
alter table photo_comments enable row level security;
alter table guestbook_entries enable row level security;
alter table event_schedule enable row level security;
alter table kahoot_quizzes enable row level security;
alter table kahoot_questions enable row level security;
alter table kahoot_answers enable row level security;
alter table kahoot_attempts enable row level security;
alter table kahoot_responses enable row level security;

-- Políticas events
create policy "owner_full_access_events" on events for all using (auth.uid() = owner_id);

-- Políticas event_modules
create policy "owner_manage_modules" on event_modules for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "public_read_modules" on event_modules for select using (true);

-- Políticas photo_tags
create policy "owner_manage_tags" on photo_tags for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "public_read_tags" on photo_tags for select using (
  exists (select 1 from events e where e.id = event_id and e.status = 'active')
);

-- Políticas photo_tag_assignments
create policy "public_insert_tag_assignment" on photo_tag_assignments for insert with check (true);
create policy "public_read_tag_assignment" on photo_tag_assignments for select using (true);

-- Políticas challenges
create policy "owner_manage_challenges" on challenges for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "public_read_challenges" on challenges for select using (
  exists (select 1 from events e where e.id = event_id and e.status = 'active')
);

-- Políticas guests
create policy "anon_insert_guest" on guests for insert with check (user_id is null);
create policy "auth_insert_own_guest" on guests for insert with check (auth.uid() = user_id);
create policy "public_read_guest" on guests for select using (true);

-- Políticas photos
create policy "public_insert_photo" on photos for insert with check (true);
create policy "public_read_photo" on photos for select using (is_hidden = false);
create policy "owner_manage_photo" on photos for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);

-- Políticas likes y comentarios
create policy "public_insert_like" on photo_likes for insert with check (true);
create policy "public_read_like" on photo_likes for select using (true);
create policy "public_insert_comment" on photo_comments for insert with check (true);
create policy "public_read_comment" on photo_comments for select using (true);

-- Políticas guestbook
create policy "public_insert_guestbook" on guestbook_entries for insert with check (true);
create policy "owner_read_guestbook" on guestbook_entries for select using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);

-- Políticas schedule
create policy "owner_manage_schedule" on event_schedule for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "public_read_schedule" on event_schedule for select using (true);

-- Políticas kahoot (simplificadas para lectura pública)
create policy "owner_manage_kahoot_quizzes" on kahoot_quizzes for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "public_read_kahoot_quizzes" on kahoot_quizzes for select using (
  exists (select 1 from events e where e.id = event_id and e.status = 'active')
);

create policy "owner_manage_kahoot_questions" on kahoot_questions for all using (
  exists (
    select 1 from kahoot_quizzes q
    join events e on e.id = q.event_id
    where q.id = quiz_id and e.owner_id = auth.uid()
  )
);
create policy "public_read_kahoot_questions" on kahoot_questions for select using (true);

create policy "owner_manage_kahoot_answers" on kahoot_answers for all using (
  exists (
    select 1 from kahoot_questions qq
    join kahoot_quizzes q on q.id = qq.quiz_id
    join events e on e.id = q.event_id
    where qq.id = question_id and e.owner_id = auth.uid()
  )
);
create policy "public_read_kahoot_answers" on kahoot_answers for select using (true);

create policy "public_insert_attempt" on kahoot_attempts for insert with check (true);
create policy "public_update_own_attempt" on kahoot_attempts for update using (true);
create policy "public_read_attempts" on kahoot_attempts for select using (true);
create policy "public_insert_response" on kahoot_responses for insert with check (true);
create policy "public_read_responses" on kahoot_responses for select using (true);

-- ============================================
-- SUPABASE STORAGE BUCKET
-- ============================================
-- Crear bucket público para "event-media"
insert into storage.buckets (id, name, public) values ('event-media', 'event-media', true);

-- Políticas del bucket de Storage
-- Permitir a cualquiera subir fotos/audios
create policy "Public Upload"
  on storage.objects for insert
  with check (bucket_id = 'event-media');

-- Permitir a cualquiera ver las fotos
create policy "Public Read"
  on storage.objects for select
  using (bucket_id = 'event-media');

-- Permitir al dueño borrar fotos
create policy "Owner Delete"
  on storage.objects for delete
  using (bucket_id = 'event-media');
