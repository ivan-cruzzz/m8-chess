-- AI-тренёр (edge function ai-coach): серверный кэш и дневные квоты.
-- Применить в Supabase SQL Editor. Идемпотентно: повторный запуск безопасен.

-- Кэш ответов: ключ = sha256(PROMPT_VERSION|action|lang|fen|san|correctSan|moves|puzzleId)
create table if not exists coach_cache (
  cache_key text primary key,
  action text not null,
  lang text not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);

alter table coach_cache enable row level security;

-- Чтение кэша — любому аутентифицированному (это публичные шахматные объяснения,
-- персональных данных нет); запись — только service role (RLS её не проверяет).
drop policy if exists "coach cache read" on coach_cache;
create policy "coach cache read" on coach_cache
  for select to authenticated using (true);

-- Дневное потребление квоты: free 5/день, premium 50/день
create table if not exists coach_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  used integer not null default 0,
  unique (user_id, day)
);

alter table coach_usage enable row level security;

-- Пользователь видит только своё потребление; запись — service role.
drop policy if exists "own coach usage read" on coach_usage;
create policy "own coach usage read" on coach_usage
  for select using (auth.uid() = user_id);

-- Гигиена кэша: записи старше 90 дней можно чистить (pg_cron при желании:
-- select cron.schedule('coach-cache-gc', 'weekly', 'delete from coach_cache where created_at < now() - interval ''90 days''');)
