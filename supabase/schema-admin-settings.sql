-- ============================================================
-- 관리자 설정: 사용자 승인, 견적 구분, 결제수단 권한
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- (schema-phase7.sql / schema-phase7-admin-policy.sql 없어도 실행 가능)
-- ============================================================

-- 0) phase7 선행 요건 (role 컬럼 + is_admin 함수)
alter table profiles
  add column if not exists role text not null default 'employee'
  check (role in ('admin', 'manager', 'employee'));

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

-- 1) 사용자 계정 상태 (초대 → 정보입력 → 관리자 승인)
alter table profiles
  add column if not exists account_status text not null default 'active'
  check (account_status in ('pending_setup', 'pending_approval', 'active'));

alter table profiles
  add column if not exists email text;

update profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

-- 기존 관리자/매니저/직원 계정은 active 로 유지
update profiles
set account_status = 'active'
where role in ('admin', 'manager', 'employee')
  and account_status in ('pending_setup', 'pending_approval');

-- 2) 견적/매출 구분 옵션 (관리자가 추가·수정)
create table if not exists sale_category_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table sale_category_options enable row level security;

drop policy if exists "로그인 사용자 견적 구분 조회" on sale_category_options;
drop policy if exists "관리자 견적 구분 등록" on sale_category_options;
drop policy if exists "관리자 견적 구분 수정" on sale_category_options;
drop policy if exists "관리자 견적 구분 삭제" on sale_category_options;

create policy "로그인 사용자 견적 구분 조회"
  on sale_category_options for select to authenticated
  using (true);

create policy "관리자 견적 구분 등록"
  on sale_category_options for insert to authenticated
  with check (public.is_admin());

create policy "관리자 견적 구분 수정"
  on sale_category_options for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "관리자 견적 구분 삭제"
  on sale_category_options for delete to authenticated
  using (public.is_admin());

insert into sale_category_options (name, sort_order)
values
  ('도매', 1),
  ('소매', 2),
  ('VIP', 3),
  ('중고', 4),
  ('렌탈', 5),
  ('온라인', 6)
on conflict (name) do nothing;

-- 기존 CHECK 제약 제거 (동적 구분 허용)
alter table quotes drop constraint if exists quotes_sale_category_check;
alter table sales drop constraint if exists sales_sale_category_check;

-- 3) 결제수단: 관리자만 등록/수정/삭제 (payment_methods 테이블이 있을 때만)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'payment_methods'
  ) then
    execute 'drop policy if exists "로그인 사용자 결제방식 등록" on payment_methods';
    execute 'drop policy if exists "로그인 사용자 결제방식 수정" on payment_methods';
    execute 'drop policy if exists "로그인 사용자 결제방식 삭제" on payment_methods';
    execute 'drop policy if exists "관리자 결제방식 등록" on payment_methods';
    execute 'drop policy if exists "관리자 결제방식 수정" on payment_methods';
    execute 'drop policy if exists "관리자 결제방식 삭제" on payment_methods';

    execute $policy$
      create policy "관리자 결제방식 등록"
        on payment_methods for insert to authenticated
        with check (public.is_admin())
    $policy$;

    execute $policy$
      create policy "관리자 결제방식 수정"
        on payment_methods for update to authenticated
        using (public.is_admin())
        with check (public.is_admin())
    $policy$;

    execute $policy$
      create policy "관리자 결제방식 삭제"
        on payment_methods for delete to authenticated
        using (public.is_admin())
    $policy$;
  end if;
end $$;
