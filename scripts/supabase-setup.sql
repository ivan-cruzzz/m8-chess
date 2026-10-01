-- M8: настройка Supabase
-- Вставьте весь этот скрипт в SQL Editor вашего проекта Supabase и выполните один раз.

-- Профили пользователей (username хранится в метаданных auth, таблица — на будущее)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  created_at timestamptz not null default now()
);

-- Подписки: Premium-статус и история платежей
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',           -- free | monthly | yearly | lifetime
  paid_until timestamptz,                      -- для monthly/yearly
  invoice_id text,                             -- последний инвойс NOWPayments
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

-- Пользователь читает только свой профиль и подписку
drop policy if exists "own profile select" on public.profiles;
create policy "own profile select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "own subscription select" on public.subscriptions;
create policy "own subscription select" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Запись ведут только edge-функции (service_role), НЕ клиент —
-- поэтому политик insert/update для анонима нет.

-- Автопрофиль при регистрации
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.subscriptions (user_id, plan) values (new.id, 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
