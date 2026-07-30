-- ============================================================
-- 7단계: 사용자 권한 (역할)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

alter table profiles
  add column if not exists role text not null default 'employee'
  check (role in ('admin', 'manager', 'employee'));

-- 가장 먼저 가입한 사용자를 관리자로 지정 (이미 admin이 있으면 건너뜀)
update profiles
set role = 'admin', updated_at = now()
where id = (
  select id from auth.users order by created_at asc limit 1
)
and not exists (select 1 from profiles where role = 'admin');

-- 역할 변경은 관리자만 가능 (트리거)
create or replace function protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  if TG_OP = 'INSERT' then
    if NEW.role is distinct from 'employee' then
      select role into caller_role from profiles where id = auth.uid();
      if caller_role is distinct from 'admin' then
        NEW.role := 'employee';
      end if;
    end if;
    return NEW;
  end if;

  if NEW.role is distinct from OLD.role then
    select role into caller_role from profiles where id = auth.uid();
    if caller_role is distinct from 'admin' then
      raise exception '역할 변경 권한이 없습니다.';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists protect_profile_role_trigger on profiles;

create trigger protect_profile_role_trigger
  before insert or update on profiles
  for each row
  execute function protect_profile_role();

-- 관리자 역할 변경 RPC + RLS (schema-phase7-admin-policy.sql 과 동일)
create or replace function public.update_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  admin_count integer;
begin
  select role into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role is distinct from 'admin' then
    raise exception '역할 변경 권한이 없습니다.';
  end if;

  if new_role not in ('admin', 'manager', 'employee') then
    raise exception '올바르지 않은 역할입니다.';
  end if;

  if target_user_id = auth.uid() and new_role is distinct from 'admin' then
    raise exception '본인의 관리자 권한은 스스로 해제할 수 없습니다.';
  end if;

  select count(*) into admin_count
  from public.profiles
  where role = 'admin';

  if admin_count = 1 then
    if exists (
      select 1
      from public.profiles
      where id = target_user_id
        and role = 'admin'
        and new_role is distinct from 'admin'
    ) then
      raise exception '마지막 관리자의 권한은 변경할 수 없습니다.';
    end if;
  end if;

  update public.profiles
  set role = new_role,
      updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception '사용자를 찾을 수 없습니다.';
  end if;
end;
$$;

revoke all on function public.update_user_role(uuid, text) from public;
grant execute on function public.update_user_role(uuid, text) to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "관리자 프로필 수정" on profiles;

create policy "관리자 프로필 수정"
  on profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
