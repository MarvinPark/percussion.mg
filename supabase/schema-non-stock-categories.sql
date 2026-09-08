-- ============================================================
-- 재고 미반영 품목 (견적·매출 시 재고 차감/예약 제외)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- (schema-admin-settings.sql 실행 후 실행 권장 — is_admin() 필요)
-- ============================================================

create table if not exists non_stock_category_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table non_stock_category_options enable row level security;

drop policy if exists "로그인 사용자 재고 미반영 품목 조회" on non_stock_category_options;
drop policy if exists "관리자 재고 미반영 품목 등록" on non_stock_category_options;
drop policy if exists "관리자 재고 미반영 품목 수정" on non_stock_category_options;
drop policy if exists "관리자 재고 미반영 품목 삭제" on non_stock_category_options;

create policy "로그인 사용자 재고 미반영 품목 조회"
  on non_stock_category_options for select to authenticated
  using (true);

create policy "관리자 재고 미반영 품목 등록"
  on non_stock_category_options for insert to authenticated
  with check (public.is_admin());

create policy "관리자 재고 미반영 품목 수정"
  on non_stock_category_options for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "관리자 재고 미반영 품목 삭제"
  on non_stock_category_options for delete to authenticated
  using (public.is_admin());

insert into non_stock_category_options (name, sort_order)
values
  ('배송비', 1),
  ('출장비', 2)
on conflict (name) do nothing;
