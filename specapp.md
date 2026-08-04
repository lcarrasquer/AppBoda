# SUPER PROMPT — SaaS de Fotos y Experiencia de Invitados para Bodas

> **Versión final del prompt.** Documento cerrado y listo para entregar a un agente de IA de desarrollo (Claude Code, Cursor, etc.) como prompt único de arranque de proyecto. Incluye visión de producto, sistema modular de funcionalidades (Fotos + Kahoot), stack, modelo de datos en SQL con RLS, arquitectura, flujos de usuario (registrado y anónimo), diseño de la sala, requisitos no funcionales y fases de desarrollo.

---

## 0. Instrucción para el agente de IA

Actúa como desarrollador full-stack senior. Construye una aplicación SaaS multi-tenant siguiendo exactamente el stack y modelo de datos definidos en este documento. Prioriza:
1. Seguridad por diseño (RLS en cada tabla, nunca confiar en el cliente).
2. Mobile-first en la WebApp de invitados (se usará 95% desde móvil, muchas veces con mala conexión de datos en el recinto).
3. Cero fricción en el acceso del invitado (sin login, sin contraseñas).
4. Código modular y tipado (TypeScript estricto en todo el proyecto).
5. Empieza por el MVP (sección 10) antes que por funcionalidades avanzadas.

Si algo no está especificado explícitamente, elige la opción más simple y estándar del ecosistema Next.js + Supabase, y documenta la decisión en un comentario o en `DECISIONS.md`.

---

## 1. Visión General del Producto

Plataforma SaaS multi-tenant para digitalizar la experiencia de los invitados en bodas. Al crear un evento, el usuario activa las funcionalidades ("módulos") que quiere incluir en la "sala" de su boda: **Fotos** (muro con etiquetas y retos fotográficos) y **Kahoot** (trivia con premio para el ganador), con más módulos planeados a futuro. Los asistentes capturan, categorizan y comparten fotos en tiempo real mediante una WebApp (PWA) de acceso instantáneo sin registro. Los novios (creadores) gestionan la boda desde un dashboard: activación y configuración de módulos, personalización visual, moderación de contenido y exportación de álbum digital en alta resolución.

**Modelo de negocio:** B2C, pago único o por planes (ej. Básico/Premium) por boda, con almacenamiento de medios de coste marginal casi nulo.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | **Next.js 14+ (App Router)** con TypeScript | SSR/SSG para el dashboard, rutas dinámicas por `event_slug`, buen soporte PWA |
| Estilos | **Tailwind CSS** + shadcn/ui | Rapidez de desarrollo, consistencia visual, componentes accesibles |
| Backend / DB | **Supabase (PostgreSQL)** | Auth, DB, Storage y Realtime en un solo proveedor; Row Level Security nativo |
| Autenticación novios | Supabase Auth (Email/Password + Google OAuth) | Estándar, integrado con RLS vía `auth.uid()` |
| Sesión invitados | **Sin Supabase Auth** — ID anónimo generado en cliente (UUID) y persistido en `localStorage` + tabla `guests` | Evita fricción; no requiere registro |
| Almacenamiento de medios | **Cloudflare R2** (S3-compatible) | Sin egress fees, crítico cuando cientos de invitados cargan el feed simultáneamente |
| Compresión de imágenes | Cliente, con `browser-image-compression` (o Canvas API nativo) | Reduce carga de red antes de subir, máx. 2000px de lado mayor |
| Marca de agua | Server-side con **sharp** en una Edge Function / Route Handler | Consistencia garantizada, no depende del dispositivo del invitado |
| Tiempo real (feed, likes) | Supabase Realtime (Postgres changes) | Actualización instantánea del muro de fotos |
| PWA | `next-pwa` o Web App Manifest + Service Worker manual | Instalable, funciona con conexión intermitente |
| Generación de QR | `qrcode` (npm) en servidor, export a PNG/PDF | Para impresión en las mesas |
| Descarga masiva (.zip) | `archiver` (Node) + streaming desde R2 | Evita cargar todo en memoria |
| Notas de audio | `MediaRecorder API` (cliente) → subida directa a R2 | Máx. 60s, formato webm/opus |
| Hosting | Vercel (frontend/API routes) + Supabase Cloud + Cloudflare R2 | Despliegue simple, escalado automático |
| Pagos | *No implementar por ahora* | Modelo de precios sin definir; fuera de alcance de esta fase (ver sección 11) |

---

## 3. Arquitectura del Sistema

```
[Invitado móvil] ──(QR/URL)──> [Next.js WebApp PWA]
                                       │
                                       ├─ Auth anónima (localStorage UUID)
                                       ├─ Compresión imagen (cliente)
                                       └─ Upload directo a R2 (URL firmada)
                                              │
[Novios/Admin] ──(login)──> [Next.js Dashboard] ──> [Supabase (Postgres + RLS + Realtime)]
                                                            │
                                                    [Route Handlers / Edge Functions]
                                                    ├─ Generar URL firmada de subida (R2)
                                                    ├─ Aplicar marca de agua (sharp)
                                                    ├─ Generar QR (PDF/PNG)
                                                    └─ Generar .zip de descarga masiva
```

**Flujo de subida de fotos (clave para evitar sobrecarga del servidor):**
1. Cliente comprime la imagen localmente.
2. Cliente pide al backend una **URL firmada (presigned URL)** de R2.
3. Cliente sube la imagen **directamente a R2** (no pasa por el servidor de Next.js).
4. Cliente notifica al backend que la subida terminó → se crea el registro en `photos` y se dispara la marca de agua de forma asíncrona.

---

## 4. Modelo de Datos (SQL completo para Supabase)

```sql
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
  status text default 'active' check (status in ('draft','active','closed','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TABLA: event_modules (funcionalidades activables por evento)
-- ============================================
-- Al crear un evento, el usuario elige qué funcionalidades añadir a la "sala".
-- Por ahora dos módulos disponibles: 'photos' (fotos + etiquetas + retos) y 'kahoot' (trivia).
-- Diseñado para poder añadir más módulos en el futuro (encuestas, juegos, etc.)
-- sin tocar el resto del esquema: basta con ampliar el check constraint.
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
-- Las etiquetas son libres y una foto puede llevar VARIAS a la vez
-- (relación N:M, ver photo_tag_assignments). Las crea el dueño del evento.
create table photo_tags (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  name text not null,                     -- ej. "Ceremonia", "Foto graciosa", "Cóctel"
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: challenges (retos, sub-funcionalidad DENTRO del módulo Fotos)
-- ============================================
-- Los retos NO son un módulo independiente: solo tienen sentido si 'photos'
-- está activo, y se configuran desde la misma pantalla de gestión de Fotos.
-- A diferencia de las etiquetas, un reto se cumple asociando UNA foto concreta
-- a él (relación 1:N con photos, ver campo photos.challenge_id).
create table challenges (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  title text not null,                    -- ej. "Selfie con corbata roja"
  description text,                       -- ej. "Sácate 2 fotos con gente que lleve corbata roja"
  icon text,
  target_photo_count int default 1,       -- meramente informativo en el MVP, no se valida automáticamente
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: guests (participantes de un evento)
-- ============================================
-- Un "guest" es la identidad de participación dentro de UN evento concreto.
-- Puede originarse de dos formas (ver sección 5, Flujo A y Flujo B):
--   - Flujo B (anónimo): id generado en el cliente y persistido en localStorage. user_id = null.
--   - Flujo A (usuario registrado): user_id = auth.uid(). Permite reconocer
--     al participante en cualquier dispositivo (no depende de localStorage).
-- En ambos casos se pide Nombre y Apellidos la primera vez que participa en ESE evento.
create table guests (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  user_id uuid references auth.users(id),   -- null si viene del Flujo B (anónimo)
  full_name text not null,
  created_at timestamptz default now()
);

-- Un usuario registrado solo puede tener UNA identidad de participación por evento
create unique index guests_event_user_unique on guests(event_id, user_id) where user_id is not null;

-- ============================================
-- TABLA: photos
-- ============================================
create table photos (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  guest_id uuid references guests(id) on delete cascade not null,
  challenge_id uuid references challenges(id),   -- opcional: como mucho UN reto por foto
  storage_path text not null,             -- ruta en R2
  watermarked_path text,                  -- ruta versión con marca de agua
  is_hidden boolean default false,        -- moderación (post-publicación, no previa)
  likes_count int default 0,
  created_at timestamptz default now()
  -- Nota: solo fotos por ahora. No se contempla vídeo en esta versión;
  -- si se añade en el futuro, requerirá nueva tabla o campo `media_type` + límites de duración/peso.
);

create index idx_photos_event on photos(event_id);
create index idx_photos_challenge on photos(challenge_id);

-- ============================================
-- TABLA: photo_tag_assignments (relación N:M foto <-> etiquetas)
-- ============================================
-- Una foto puede llevar varias etiquetas a la vez (ej. "Ceremonia" + "Foto graciosa").
-- Esto es independiente del reto (challenge_id en photos): una foto puede tener
-- 0-N etiquetas Y opcionalmente 1 reto, ambas cosas a la vez.
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
-- TABLA: guestbook_entries (libro de visitas: texto y audio)
-- ============================================
create table guestbook_entries (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  guest_id uuid references guests(id) not null,
  type text not null check (type in ('text','audio')),
  content text,                           -- texto de la dedicatoria
  audio_path text,                        -- ruta en R2 si type = audio
  duration_seconds int,                   -- para audio, máx 60
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
-- MÓDULO KAHOOT (trivia libre / asíncrona — decisión de producto:
-- cada invitado responde cuando quiere, sin sincronización en directo)
-- ============================================

-- TABLA: kahoot_quizzes
create table kahoot_quizzes (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  title text not null,
  prize_description text,                 -- ej. "Una botella de cava para el ganador"
  is_active boolean default true,
  created_at timestamptz default now()
);

-- TABLA: kahoot_questions
create table kahoot_questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references kahoot_quizzes(id) on delete cascade not null,
  question_text text not null,
  image_url text,                         -- opcional, imagen de apoyo a la pregunta
  points int default 10,
  sort_order int default 0
);

-- TABLA: kahoot_answers
create table kahoot_answers (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid references kahoot_questions(id) on delete cascade not null,
  answer_text text not null,
  is_correct boolean default false,
  sort_order int default 0
);

-- TABLA: kahoot_attempts (un intento de un invitado sobre un quiz completo)
create table kahoot_attempts (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references kahoot_quizzes(id) on delete cascade not null,
  guest_id uuid references guests(id) on delete cascade not null,
  score int default 0,
  started_at timestamptz default now(),
  completed_at timestamptz,               -- se rellena al responder la última pregunta
  unique(quiz_id, guest_id)               -- un invitado solo puede intentar el quiz una vez
);

-- TABLA: kahoot_responses (respuesta individual a cada pregunta dentro de un intento)
create table kahoot_responses (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid references kahoot_attempts(id) on delete cascade not null,
  question_id uuid references kahoot_questions(id) not null,
  answer_id uuid references kahoot_answers(id) not null,
  is_correct boolean not null,
  created_at timestamptz default now(),
  unique(attempt_id, question_id)         -- una respuesta por pregunta por intento
);

-- Leaderboard: se calcula con una consulta/vista, ordenando por score desc
-- y completed_at asc como criterio de desempate (quien termina antes, gana el empate).
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
-- ROW LEVEL SECURITY
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

-- events: el dueño puede todo; lectura pública limitada vía función/vista específica
create policy "owner_full_access_events" on events
  for all using (auth.uid() = owner_id);

-- event_modules: el dueño activa/desactiva; lectura pública (para saber qué mostrar en la "sala")
create policy "owner_manage_modules" on event_modules
  for all using (
    exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
  );
create policy "public_read_modules" on event_modules for select using (true);

-- photo_tags: el dueño gestiona; lectura pública si el evento está activo
create policy "owner_manage_tags" on photo_tags
  for all using (
    exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
  );
create policy "public_read_tags" on photo_tags
  for select using (
    exists (select 1 from events e where e.id = event_id and e.status = 'active')
  );

-- photo_tag_assignments: inserción pública (el invitado etiqueta su propia foto al subirla)
create policy "public_insert_tag_assignment" on photo_tag_assignments for insert with check (true);
create policy "public_read_tag_assignment" on photo_tag_assignments for select using (true);

-- challenges (retos): el dueño gestiona; lectura pública si el evento está activo
create policy "owner_manage_challenges" on challenges
  for all using (
    exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
  );
create policy "public_read_challenges" on challenges
  for select using (
    exists (select 1 from events e where e.id = event_id and e.status = 'active')
  );

-- guests: inserción pública para invitados anónimos (Flujo B);
-- inserción autenticada solo permitida sobre el propio user_id (Flujo A, evita suplantación)
create policy "anon_insert_guest" on guests
  for insert with check (user_id is null);
create policy "auth_insert_own_guest" on guests
  for insert with check (auth.uid() = user_id);
create policy "public_read_guest" on guests for select using (true);

-- photos: inserción pública (con guest_id válido), lectura pública si no está oculta
create policy "public_insert_photo" on photos for insert with check (true);
create policy "public_read_photo" on photos for select using (is_hidden = false);
create policy "owner_manage_photo" on photos
  for all using (
    exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
  );

-- likes y comentarios: públicos (mundo de invitados sin login)
create policy "public_insert_like" on photo_likes for insert with check (true);
create policy "public_read_like" on photo_likes for select using (true);
create policy "public_insert_comment" on photo_comments for insert with check (true);
create policy "public_read_comment" on photo_comments for select using (true);

-- guestbook: inserción pública, lectura solo del dueño (privacidad de las dedicatorias)
create policy "public_insert_guestbook" on guestbook_entries for insert with check (true);
create policy "owner_read_guestbook" on guestbook_entries
  for select using (
    exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
  );

-- schedule: gestión del dueño, lectura pública
create policy "owner_manage_schedule" on event_schedule
  for all using (
    exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
  );
create policy "public_read_schedule" on event_schedule for select using (true);

-- kahoot_quizzes: gestión del dueño, lectura pública si el evento está activo
create policy "owner_manage_kahoot_quizzes" on kahoot_quizzes
  for all using (
    exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
  );
create policy "public_read_kahoot_quizzes" on kahoot_quizzes
  for select using (
    exists (select 1 from events e where e.id = event_id and e.status = 'active')
  );

-- kahoot_questions / kahoot_answers: gestión del dueño vía join hasta events, lectura pública
create policy "owner_manage_kahoot_questions" on kahoot_questions
  for all using (
    exists (
      select 1 from kahoot_quizzes q
      join events e on e.id = q.event_id
      where q.id = quiz_id and e.owner_id = auth.uid()
    )
  );
create policy "public_read_kahoot_questions" on kahoot_questions for select using (true);

create policy "owner_manage_kahoot_answers" on kahoot_answers
  for all using (
    exists (
      select 1 from kahoot_questions qq
      join kahoot_quizzes q on q.id = qq.quiz_id
      join events e on e.id = q.event_id
      where qq.id = question_id and e.owner_id = auth.uid()
    )
  );
create policy "public_read_kahoot_answers" on kahoot_answers for select using (true);

-- kahoot_attempts / kahoot_responses: públicos (mundo de invitados sin login)
create policy "public_insert_attempt" on kahoot_attempts for insert with check (true);
create policy "public_update_own_attempt" on kahoot_attempts for update using (true);
create policy "public_read_attempts" on kahoot_attempts for select using (true);
create policy "public_insert_response" on kahoot_responses for insert with check (true);
create policy "public_read_responses" on kahoot_responses for select using (true);
```

> **Nota de seguridad — Kahoot:** con `public_read_kahoot_answers` usando `using (true)`, cualquiera puede leer `is_correct` directamente desde el cliente (ej. abriendo las devtools) antes de responder, haciendo trampa. Es una simplificación aceptable para el MVP porque es un juego informal de boda, pero si se quiere evitarlo del todo, la validación de la respuesta correcta debe moverse a una función RPC de Postgres con `security definer` (`submit_kahoot_answer(question_id, answer_id)`) que calcule `is_correct` en el servidor y nunca exponga la columna al cliente.

> **Nota de seguridad general:** las políticas de inserción pública (`with check (true)`) son necesarias porque los invitados no usan Supabase Auth. Para mitigar abuso/spam, el backend debe validar en el Route Handler que el `event_id` existe, está `active`, y (si `pin_enabled`) que el PIN es correcto, antes de permitir cualquier escritura. Considerar rate limiting por IP a nivel de Edge Function.

---

### 4.1 Política de Eliminación de Datos

Decisión de producto: **no hay borrado automático por tiempo**. Las fotos y demás contenido viven mientras la sala exista. El borrado ocurre solo en dos casos, disparados por el dueño de la cuenta:

1. **Finalizar evento** (`events.status = 'closed'`): deja de aceptar nuevas subidas/interacciones (RLS pública queda condicionada a `status = 'active'`, ver sección 4 "public_read_challenges"), pero el contenido sigue accesible en modo solo-lectura para el dueño y descargable. No borra nada por sí solo.
2. **Eliminar sala** (borrado explícito desde el dashboard, con doble confirmación en UI): borra en cascada la fila de `events` (Postgres `on delete cascade` ya limpia `event_modules`, `photo_tags`, `photo_tag_assignments`, `challenges`, `guests`, `photos`, `photo_likes`, `photo_comments`, `guestbook_entries`, `event_schedule`, `kahoot_quizzes` y en cascada sus `kahoot_questions`/`kahoot_answers`/`kahoot_attempts`/`kahoot_responses`). **Importante:** el `cascade` de Postgres solo borra registros de la base de datos, **no** los objetos físicos en Cloudflare R2. Se requiere una Edge Function/Route Handler (`/api/events/[id]/delete`) que:
   - Liste todos los `storage_path` / `watermarked_path` / `audio_path` asociados al evento.
   - Los borre de R2 (llamada batch a la API S3-compatible).
   - Solo entonces borre la fila `events` (o use una transacción/orden inverso con manejo de errores para evitar huérfanos en R2).

Recomendación técnica: implementar esto como una función de Postgres + `pg_net`/Edge Function en lugar de depender solo del `cascade` de SQL, precisamente para poder limpiar R2 antes o después de forma controlada.

Antes de un borrado de sala, la UI debe forzar/recordar al dueño que descargue el `.zip` si aún no lo ha hecho ("Esta acción eliminará todas las fotos de forma permanente. ¿Has descargado el álbum?").

---

## 5. Flujos de Usuario

Existen dos formas de entrar y participar en un evento (subir fotos, dar likes, dejar dedicatorias). Ambas convergen en la misma pantalla de feed y usan la misma tabla `guests`; lo que cambia es cómo se identifica al participante.

### 5.1 Flujo A — Usuario registrado (crea eventos Y participa)

El usuario tiene cuenta (email/password o Google). Con ella puede:

1. **Crear y configurar eventos** (rol de novio/administrador): onboarding, personalización, retos, PIN, moderación, exportación — descrito en el resto del documento.
2. **Entrar y participar como asistente** en:
   - **Sus propios eventos** (los que creó), y
   - **Cualquier evento del que tenga el código/QR**, aunque no sea suyo (por ejemplo, un invitado que se descarga la app y prefiere loguearse en vez de usar el flujo anónimo).

**Pasos:**
1. El usuario, ya logueado, accede a `/e/{slug}` (por QR, código manual, o desde su listado de "Mis Eventos", ver 6).
2. Si `pin_enabled = true`, se solicita el PIN (igual que en el Flujo B).
3. El backend comprueba si ya existe una fila en `guests` con `event_id = X` y `user_id = auth.uid()`.
   - **No existe (primera vez en este evento):** se muestra el formulario de Nombre y Apellidos (sí, aunque esté logueado — decisión de producto: el nombre de participación no se hereda automáticamente del perfil). Al enviarlo se crea la fila `guests` con `user_id = auth.uid()`.
   - **Ya existe:** se salta el formulario y entra directo al feed, **desde cualquier dispositivo** (a diferencia del Flujo B, aquí la identidad no depende de `localStorage` sino de la cuenta).
4. Acceso total al feed, libro de visitas, cronograma, etc., igual que un invitado del Flujo B.

> Nota: si el usuario es además el `owner_id` del evento, esto NO le da permisos de participante especiales en el feed (sigue siendo un `guest` más a efectos de likes/comentarios/fotos); sus permisos de administración siguen viviendo en el Dashboard, gobernados por las políticas `owner_*` de la sección 4.

### 5.2 Flujo B — Invitado anónimo (fricción cero)

Sin cuenta, sin contraseña. Pensado para el 100% de los invitados que solo quieren participar sin fricción.

1. Escanea el QR físico de la mesa (o introduce el código del evento manualmente).
2. Redirección a `/e/{slug}`.
3. La WebApp revisa `localStorage` en busca de un `guest_id` guardado para ese `event_id`.
4. **No hay sesión previa:** pantalla de bienvenida pidiendo Nombre y Apellidos. Al guardar se crea la fila `guests` con `user_id = null`, se genera un UUID y se guarda en `localStorage` del dispositivo.
5. **Ya hay sesión:** entra directo al feed.
6. Si `pin_enabled = true`, se solicita el PIN antes de continuar (en ambos casos, primera vez o no).
7. Acceso al feed. La sesión persiste en ese dispositivo/navegador; si el invitado cambia de móvil o borra datos del navegador, tendrá que volver a introducir su nombre (se crea una nueva fila `guests`, sin vincular a la anterior).

### 5.3 Creación del evento y activación de módulos (Novios / Admin)

1. Registro (email/password o Google Auth) — misma cuenta que en el Flujo A.
2. **Crear evento (datos básicos):** el usuario pulsa "Crear evento" e introduce nombres, fecha, ubicación → se crea la fila en `events` con `status = 'draft'`. Se genera automáticamente el `slug` único.
3. **Entra a la "sala" de configuración del evento** (`/dashboard/{eventId}`), donde ve un catálogo de funcionalidades disponibles para añadir:
   - 🖼️ **Fotos** — muro de fotos con etiquetas y retos.
   - 🧠 **Kahoot** — trivia con premio para el ganador.
   - *(catálogo ampliable en el futuro: encuestas, playlist colaborativa, etc. — ver nota de extensibilidad en sección 4)*
4. Al activar una funcionalidad, se crea/actualiza su fila en `event_modules` (`is_enabled = true`) y aparece un botón "Configurar" para esa tarjeta:
   - **Configurar Fotos:** el dueño crea las **etiquetas** libres (`photo_tags`, ej. "Ceremonia", "Cóctel", "Foto graciosa") y, si quiere, los **retos** (`challenges`, ej. "Selfie con corbata roja", "Foto grupal", "Foto con tu pareja de baile"). Los retos son opcionales y viven dentro de esta misma pantalla — no son un módulo aparte.
   - **Configurar Kahoot:** el dueño crea el quiz (`kahoot_quizzes`, con título y premio para el ganador) y añade sus preguntas (`kahoot_questions`, con imagen opcional) y las posibles respuestas de cada una (`kahoot_answers`, marcando cuál es la correcta).
5. Personalización visual: colores, logo, marca de agua → actualiza `events`.
6. Cuando el evento está listo, el dueño lo **publica** (`events.status = 'draft' → 'active'`) y genera/descarga el QR (PNG/PDF) con la URL del evento.
7. Durante/después del evento: moderación en `photos`, descarga masiva `.zip`, exportación de `guestbook_entries`, seguimiento del leaderboard de Kahoot, finalizar o eliminar el evento (ver 4.1).

> Los módulos **no activados** simplemente no aparecen en la "sala" que ven los invitados (ni en el feed, ni en la navegación). Un evento puede tener activo solo Fotos, solo Kahoot, ambos, o (en el futuro) ninguno con solo libro de visitas/info, que siguen siendo funcionalidades core, no módulos desactivables por ahora.

### 5.4 Subida de foto (aplica igual en Flujo A y Flujo B)

1. El participante (autenticado o anónimo) pulsa el botón cámara → captura o selecciona de galería.
2. Compresión local a máx. 2000px.
3. Modal antes de enviar:
   - **Etiquetas** (`photo_tags`): selección múltiple, opcional o obligatoria mínimo 1 (a definir en UI — recomendado: opcional, para no añadir fricción).
   - **Reto** (`challenges`): selector de UN reto activo como máximo, opcional — solo visible si el evento tiene retos configurados.
4. Solicitud de URL firmada al backend → subida directa a R2.
5. Confirmación → insert en `photos` (con `challenge_id` si se eligió reto) + inserts en `photo_tag_assignments` por cada etiqueta elegida → Edge Function aplica marca de agua de forma asíncrona.
6. El feed se actualiza en tiempo real vía Supabase Realtime para todos los participantes conectados, sin importar por qué flujo hayan entrado.

### 5.5 Participar en Kahoot (trivia libre)

1. El participante entra a la sección Kahoot dentro de la sala del evento (solo visible si el módulo está activo).
2. Ve el quiz disponible con su premio (`kahoot_quizzes.prize_description`). Si ya tiene un intento (`kahoot_attempts` para su `guest_id`), ve directamente su resultado y el leaderboard, no puede repetir.
3. Si no ha jugado: se crea su `kahoot_attempts` (`started_at = now()`) y empieza a responder preguntas **a su propio ritmo, sin límite de tiempo ni sincronización con otros invitados** (decisión de producto: trivia libre, no en directo).
4. Por cada pregunta respondida se inserta una fila en `kahoot_responses` y se actualiza `kahoot_attempts.score` sumando los puntos si es correcta.
5. Al responder la última pregunta se marca `completed_at = now()` y se muestra su puntuación final junto al `kahoot_leaderboard` (ordenado por puntos y, en caso de empate, por quién terminó antes).

---

## 6. Funcionalidades por Sección

### 6.1 Estructura visual de la sala (invitado, `/e/{slug}`)

Pantalla única, mobile-first, con esta jerarquía de arriba a abajo:

1. **Cabecera:** nombres de los novios + fecha.
2. **Banner de Kahoot** *(solo si `event_modules.kahoot.is_enabled = true`)*: icono de trofeo, nombre del premio (`kahoot_quizzes.prize_description`) y botón "Jugar" que lleva a la pantalla de trivia. Si el invitado ya completó su intento, el banner cambia a mostrar su puntuación en vez de "Jugar".
3. **Filtros por etiqueta/reto:** fila de chips horizontal con scroll, "Todas" + `photo_tags` del evento *(solo si `event_modules.photos.is_enabled = true`)*.
4. **Feed de fotos:** grid de 2 columnas, scroll infinito.
5. **Botón flotante de subida (FAB):** icono de cámara, fijo en la esquina inferior derecha del feed *(solo si el módulo Fotos está activo)*. Al pulsarlo despliega dos opciones, sin salir de la pantalla:
   - **Hacer foto** → abre la cámara nativa del móvil directamente (`<input type="file" accept="image/*" capture="environment">` o API nativa si se envuelve como PWA instalada).
   - **Elegir de galería** → abre el selector de archivos del sistema (`<input type="file" accept="image/*">` sin `capture`).
   
   Ambas opciones desembocan en el mismo flujo descrito en 5.4 (compresión → etiquetas/reto opcional → subida).
6. **Ranking de Kahoot** *(solo si el módulo está activo y hay al menos un intento completado)*: lista de `kahoot_leaderboard`, mostrando **hasta 10 participantes** (no solo el podio) con scroll vertical si hay más. Si el invitado no está dentro de los primeros 10, se fija su propia fila al final de la lista (ej. "14. Tú — 5 pts") para que siempre pueda ver su posición sin tener que buscarla.
7. **Navegación inferior:** Feed · Kahoot *(si activo)* · Libro de visitas · Info — siempre visible, cambia de pantalla sin recargar (client-side routing).

> Regla general de la sala: **cada sección de la UI aparece si y solo si su módulo está activo** (`event_modules`). Con ambos módulos desactivados, la sala se reduce a Libro de visitas + Info, que son funcionalidades core no desactivables por ahora.


### 6.2 WebApp Móvil (Invitado) — detalle por sección
| Sección | Funcionalidad | Detalle técnico |
|---|---|---|
| Feed | Muro de fotos | Scroll infinito, paginación por cursor (`created_at`), Realtime para nuevas fotos |
| Feed | Likes | Toggle optimista en cliente, `unique(photo_id, guest_id)` evita duplicados |
| Feed | Comentarios | Lista simple bajo cada foto, sin edición ni borrado por parte del invitado |
| Feed | Filtros | Tabs por etiqueta (`photo_tags`, N:M vía `photo_tag_assignments`) y por reto específico (`challenges`, 1:N vía `photos.challenge_id`) |
| Kahoot *(si módulo activo)* | Jugar trivia | Preguntas una a una a su ritmo, sin cronómetro ni sincronización con otros invitados; ver 5.5 |
| Kahoot *(si módulo activo)* | Leaderboard | Vista `kahoot_leaderboard`, ordenada por puntos y desempate por rapidez en completar. Muestra hasta 10 participantes + fila fija con la posición propia si queda fuera |
| Libro de visitas | Texto | Textarea + envío a `guestbook_entries` |
| Libro de visitas | Audio | `MediaRecorder`, límite 60s, barra de progreso, subida a R2 |
| Info evento | Cronograma | Render de `event_schedule` ordenado por `scheduled_time` |
| Info evento | Datos prácticos | Links directos: `geo:`/Google Maps, `tel:`, texto plano del Wi-Fi |

### 6.3 Dashboard Web (Novios / Usuario registrado)
| Sección | Funcionalidad | Detalle técnico |
|---|---|---|
| Inicio | **Mis Eventos** | Dos listados tras el login: (1) *Eventos que organizo* (`events where owner_id = auth.uid()`) y (2) *Eventos en los que participo* (`events` join `guests where guests.user_id = auth.uid()`). Necesario porque en el Flujo A la identidad no depende de guardar el QR/link — el usuario debe poder volver a entrar a un evento ajeno sin re-escanear nada. |
| Configuración | **Catálogo de módulos** | Activar/desactivar Fotos y Kahoot para el evento (`event_modules.is_enabled`). Determina qué secciones ve el invitado en la sala. |
| Configuración | Gestión de Fotos | CRUD de **etiquetas** (`photo_tags`) y, opcionalmente, de **retos** (`challenges`) dentro de la misma pantalla — los retos dependen de que el módulo Fotos esté activo. Drag-and-drop para `sort_order` en ambos. |
| Configuración | Gestión de Kahoot | CRUD del quiz (`kahoot_quizzes`, incluye premio), sus preguntas (`kahoot_questions`, con carga de imagen opcional) y respuestas (`kahoot_answers`, marcando la correcta). Vista de leaderboard en vivo mientras los invitados juegan. |
| Configuración | Seguridad de acceso | Toggle `pin_enabled` + input `pin_code` (4 dígitos) |
| Moderación | Panel de control | **Sin moderación previa**: toda foto subida se publica automáticamente y de inmediato en el feed. El panel permite revisar a posteriori y ocultar (`is_hidden = true`) o borrar fotos ya publicadas. Grid con todas las fotos (incluidas ocultas), toggle `is_hidden`, borrado físico (soft delete recomendado) |
| Exportación | Descarga de fotos | Endpoint que arma `.zip` en streaming desde R2, organizado por carpetas: `Retos/{nombre_reto}/` para las que tienen reto asociado, `Sin_reto/` para el resto |
| Exportación | Exportación de firmas | PDF con textos (via `pdf` skill/lib) + `.zip` de audios |

---

## 7. Requisitos No Funcionales

- **Rendimiento:** feed debe cargar primeras 20 fotos en <2s en 4G. Imágenes servidas en formato WebP/AVIF con `next/image` o transformación en R2.
- **Offline-friendly:** service worker cachea shell de la app; si falla la subida por conexión, reintentar con cola local (IndexedDB).
- **Escalabilidad:** subidas van directas a R2 (no saturan el servidor Next.js). Diseñado para eventos de hasta ~300 invitados subiendo simultáneamente.
- **Privacidad:** dedicatorias del libro de visitas solo visibles para el dueño del evento. Fotos ocultas por moderación no aparecen en el feed público bajo ninguna circunstancia.
- **Retención de datos:** las fotos permanecen disponibles en la plataforma indefinidamente mientras la sala/evento exista. La cuenta creadora (novios) puede descargar en cualquier momento un `.zip` con todas las fotos en alta calidad. Las fotos (y demás contenido asociado: comentarios, likes, libro de visitas) se eliminan de forma permanente únicamente cuando el evento se marca como `closed`/finalizado de forma explícita, o cuando la sala es eliminada por el dueño. Ver detalle en sección 4.1 y 10.
- **Accesibilidad:** contraste AA mínimo, botones táctiles ≥44px (uso mayoritario en móvil, muchas veces con vestimenta formal/poca destreza).
- **Internacionalización:** lanzamiento **solo en español**, sin soporte multi-idioma. No es necesario montar infraestructura de `i18n` en esta fase; los textos pueden ir hardcodeados en español directamente en los componentes.

---

## 8. Variables de Entorno

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

NEXT_PUBLIC_APP_URL=

# Nota: no se incluyen variables de Stripe/pagos; el modelo de precios
# queda fuera de alcance de esta fase (ver sección 11).
```

---

## 9. Estructura de Carpetas Sugerida

```
/app
  /(guest)
    /e/[slug]/page.tsx          -> feed principal (Flujo A si hay sesión, Flujo B si no)
    /e/[slug]/kahoot/page.tsx   -> juego + leaderboard (si módulo activo)
    /e/[slug]/guestbook/page.tsx
    /e/[slug]/info/page.tsx
  /(admin)
    /dashboard/page.tsx          -> "Mis Eventos": organizo + participo
    /dashboard/[eventId]/settings/page.tsx
    /dashboard/[eventId]/modules/page.tsx        -> activar/desactivar módulos
    /dashboard/[eventId]/photos-config/page.tsx  -> etiquetas + retos
    /dashboard/[eventId]/kahoot-config/page.tsx  -> quiz, preguntas, respuestas, premio
    /dashboard/[eventId]/moderation/page.tsx
    /dashboard/[eventId]/export/page.tsx
  /api
    /upload/sign/route.ts        -> genera URL firmada R2
    /upload/complete/route.ts    -> registra foto + tags + reto, dispara marca de agua
    /kahoot/submit-answer/route.ts -> valida respuesta y actualiza score (ver nota RLS de sección 4)
    /export/zip/route.ts
    /export/guestbook/route.ts
    /qr/generate/route.ts
/components
  /guest (FeedCard, TagSelector, ChallengeSelector, KahootQuestionCard, AudioRecorder...)
  /admin (ModuleToggleCard, TagEditor, ChallengeEditor, KahootQuestionEditor, ModerationGrid...)
  /ui (shadcn)
/lib
  /supabase (client.ts, server.ts)
  /r2 (client.ts, presign.ts)
  /image (compress.ts, watermark.ts)
/types
  database.types.ts   -> generado con `supabase gen types typescript`
```

---

## 10. Fases de Desarrollo (Roadmap)

**Fase 1 — MVP (imprescindible para lanzar una boda real)**
- Auth novios + creación de evento básico (datos + slug + `status = draft`)
- Sistema de módulos: activar/desactivar Fotos (Kahoot puede ir en Fase 2)
- Acceso invitado sin login + captura de nombre (Flujo B)
- Gestión de etiquetas (`photo_tags`) — los retos pueden esperar a Fase 2
- Subida de foto con selección de etiquetas (sin marca de agua aún)
- Feed con scroll infinito (sin Realtime, polling simple)
- Publicar evento + generación de QR
- Descarga masiva `.zip`

**Fase 2 — Experiencia completa**
- Flujo A: participación de usuarios registrados (identidad por `user_id`, pantalla "Mis Eventos")
- Retos (`challenges`) dentro del módulo Fotos
- Módulo Kahoot completo: creación de quiz/preguntas/respuestas/premio, juego libre, leaderboard
- Likes y comentarios
- Realtime en el feed
- Libro de visitas (texto + audio)
- Marca de agua automática
- Cronograma e info práctica
- PIN de seguridad

**Fase 3 — Escalado**
- Panel de moderación avanzado (siempre post-publicación, no bloqueante)
- Validación server-side de respuestas Kahoot vía RPC (evitar trampas, ver nota RLS sección 4)
- Exportación de firmas en PDF
- Flujo de "finalizar evento" y "eliminar sala" (con limpieza de R2, ver sección 4.1)
- PWA instalable con soporte offline robusto

**Fuera de alcance por ahora (no desarrollar todavía):**
- Vídeos (solo fotos en esta versión)
- Multi-idioma (solo español)
- Modelo de precios / pagos (Stripe queda listado en el stack como opción futura, pero no se implementa ni se define pricing en esta fase)

---

## 11. Decisiones de Producto (cerradas)

- **Retención:** sin borrado automático por tiempo. Las fotos viven mientras exista la sala; el dueño puede descargar el `.zip` cuando quiera. Se borran solo al finalizar/eliminar la sala explícitamente (ver 4.1).
- **Vídeo:** no incluido en esta versión, solo fotos.
- **Moderación:** no hay moderación previa; todo se publica al instante y se modera después (ocultar/borrar).
- **Idioma:** solo español en el lanzamiento, sin `i18n`.
- **Precios/pagos:** no se define ni se implementa en esta fase. Queda fuera de alcance del MVP y de las fases siguientes por ahora.
- **Eventos modulares:** al crear un evento, el usuario activa las funcionalidades que quiere desde un catálogo (por ahora: Fotos, Kahoot). Solo lo activado aparece en la sala del evento.
- **Etiquetas de fotos:** una foto puede llevar **varias etiquetas a la vez** (relación N:M vía `photo_tag_assignments`).
- **Retos:** son una sub-funcionalidad **dentro** del módulo Fotos, no un módulo independiente. Una foto puede tener como máximo un reto asociado, además de sus etiquetas.
- **Kahoot:** funciona como **trivia libre/asíncrona** — cada invitado responde el cuestionario a su ritmo, sin sincronización en directo entre participantes ni control de anfitrión en tiempo real. Incluye premio configurable para el ganador y leaderboard por puntos (desempate por rapidez en completar).
