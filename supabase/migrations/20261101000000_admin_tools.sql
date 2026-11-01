-- M8: инструменты админ-панели — блокировка пользователей и RLS для роли admin
-- Профиль админа назначается отдельно (scripts/create-admin.mjs): profiles.role = 'admin'

-- Колонка блокировки: true — вход по паролю отклоняется (signOut + ошибка banned)
alter table public.profiles add column if not exists banned boolean not null default false;

-- Колонка роли может отсутствовать, если create-admin.mjs не запускался — RLS ниже на неё опирается
alter table public.profiles add column if not exists role text not null default 'user';

-- Проверка «текущий пользователь — админ» через security definer функцию:
-- прямой подзапрос к profiles внутри политики той же таблицы дал бы бесконечную рекурсию RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- Админ читает все профили (список пользователей во вкладке Пользователи);
-- обычный пользователь по-прежнему видит только свой профиль (политика "own profile select")
drop policy if exists "admin profiles select" on public.profiles;
create policy "admin profiles select" on public.profiles
  for select using (public.is_admin());

-- Обновлять профили (в панели — только banned) может только админ
drop policy if exists "admin profiles update" on public.profiles;
create policy "admin profiles update" on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin());

-- revoke лишних прав с security definer функции (не должна быть публично вызываемой как service_role)
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
