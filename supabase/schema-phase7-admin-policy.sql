-- ============================================================
-- 7단계 보완: 관리자 역할 변경 (RPC)
-- schema-phase7.sql 실행 후 역할 변경이 안 될 때 이 파일만 Run
-- ============================================================

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

-- (선택) RLS 정책 — RPC만 써도 되지만, 직접 update도 허용하려면 함께 사용
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
