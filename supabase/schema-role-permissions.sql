-- ============================================================
-- 역할별 접근 권한 (관리자 페이지에서 설정)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

create table if not exists role_permission_grants (
  role text not null check (role in ('admin', 'manager', 'employee')),
  permission text not null,
  primary key (role, permission)
);

alter table role_permission_grants enable row level security;

drop policy if exists "로그인 사용자 역할 권한 조회" on role_permission_grants;
drop policy if exists "관리자 역할 권한 수정" on role_permission_grants;

create policy "로그인 사용자 역할 권한 조회"
  on role_permission_grants for select to authenticated
  using (true);

create policy "관리자 역할 권한 수정"
  on role_permission_grants for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into role_permission_grants (role, permission) values
  ('admin', 'viewProducts'),
  ('admin', 'manageProducts'),
  ('admin', 'viewSales'),
  ('admin', 'createSales'),
  ('admin', 'manageSales'),
  ('admin', 'viewQuotes'),
  ('admin', 'manageQuotes'),
  ('admin', 'manageUsers'),
  ('admin', 'managePaymentMethods'),
  ('manager', 'viewProducts'),
  ('manager', 'manageProducts'),
  ('manager', 'viewSales'),
  ('manager', 'createSales'),
  ('manager', 'manageSales'),
  ('manager', 'viewQuotes'),
  ('manager', 'manageQuotes'),
  ('employee', 'viewProducts'),
  ('employee', 'viewSales'),
  ('employee', 'createSales'),
  ('employee', 'manageSales'),
  ('employee', 'viewQuotes'),
  ('employee', 'manageQuotes')
on conflict (role, permission) do nothing;
