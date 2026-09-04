-- ============================================================
-- 판관비 (관리자 전용)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

create table if not exists overhead_categories (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  item_name text not null,
  group_sort_order integer not null default 0,
  item_sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (group_name, item_name)
);

create table if not exists overhead_expenses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references overhead_categories(id) on delete restrict,
  expense_date date not null,
  accrual_month date not null,
  amount numeric(12, 0) not null check (amount >= 0),
  memo text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists overhead_expenses_accrual_month_idx
  on overhead_expenses (accrual_month desc, expense_date desc);

create index if not exists overhead_expenses_category_id_idx
  on overhead_expenses (category_id);

alter table overhead_categories enable row level security;
alter table overhead_expenses enable row level security;

drop policy if exists "관리자 판관비 항목 조회" on overhead_categories;
drop policy if exists "관리자 판관비 항목 등록" on overhead_categories;
drop policy if exists "관리자 판관비 항목 수정" on overhead_categories;
drop policy if exists "관리자 판관비 항목 삭제" on overhead_categories;

create policy "관리자 판관비 항목 조회"
  on overhead_categories for select to authenticated
  using (public.is_admin());

create policy "관리자 판관비 항목 등록"
  on overhead_categories for insert to authenticated
  with check (public.is_admin());

create policy "관리자 판관비 항목 수정"
  on overhead_categories for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "관리자 판관비 항목 삭제"
  on overhead_categories for delete to authenticated
  using (public.is_admin());

drop policy if exists "관리자 판관비 조회" on overhead_expenses;
drop policy if exists "관리자 판관비 등록" on overhead_expenses;
drop policy if exists "관리자 판관비 수정" on overhead_expenses;
drop policy if exists "관리자 판관비 삭제" on overhead_expenses;

create policy "관리자 판관비 조회"
  on overhead_expenses for select to authenticated
  using (public.is_admin());

create policy "관리자 판관비 등록"
  on overhead_expenses for insert to authenticated
  with check (public.is_admin());

create policy "관리자 판관비 수정"
  on overhead_expenses for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "관리자 판관비 삭제"
  on overhead_expenses for delete to authenticated
  using (public.is_admin());

insert into overhead_categories (group_name, item_name, group_sort_order, item_sort_order)
values
  ('인건비', '급여', 1, 1),
  ('인건비', '상여·성과급', 1, 2),
  ('인건비', '4대보험 (회사부담)', 1, 3),
  ('인건비', '퇴직급여·퇴직연금', 1, 4),
  ('인건비', '파트·아르바이트', 1, 5),
  ('인건비', '복리후생 (식대·경조·단체보험 등)', 1, 6),
  ('임차·시설', '매장 임대료 (B1)', 2, 1),
  ('임차·시설', '사무실 임대료 (3층)', 2, 2),
  ('임차·시설', '의왕 창고 임대료', 2, 3),
  ('임차·시설', '관리비·공과금 (전기·수도·가스)', 2, 4),
  ('임차·시설', '보안·CCTV', 2, 5),
  ('임차·시설', '시설 수리·유지보수', 2, 6),
  ('임차·시설', '인테리어·집기 비품', 2, 7),
  ('물류·운영', '택배·퀵', 3, 1),
  ('물류·운영', '포장재·박스·완충재', 3, 2),
  ('물류·운영', '장비·공구 소모품', 3, 3),
  ('물류·운영', '폐기·처리비', 3, 4),
  ('마케팅·영업', '온라인 광고', 4, 1),
  ('마케팅·영업', '전단·인쇄·홍보물', 4, 2),
  ('마케팅·영업', 'SNS·콘텐츠 제작', 4, 3),
  ('마케팅·영업', '전시·행사·세미나', 4, 4),
  ('금융·결제', 'PG 이용 요금', 5, 1),
  ('금융·결제', '카드 단말기 이용 요금', 5, 2),
  ('금융·결제', '은행 수수료', 5, 3),
  ('세무·법무·행정', '세무사·기장료', 6, 1),
  ('세무·법무·행정', '각종 인증 비용', 6, 2),
  ('세무·법무·행정', '협회·단체 회비', 6, 3),
  ('보험·안전', '화재·배상책임 보험', 7, 1),
  ('보험·안전', '적재물·운송 보험', 7, 2),
  ('보험·안전', '기타 보험', 7, 3),
  ('차량·출장', '유류·주차·통행료', 8, 1),
  ('차량·출장', '차량 유지·보험', 8, 2),
  ('차량·출장', '출장비·교통비', 8, 3),
  ('접대·의전', '접대비', 9, 1),
  ('기타 판관비', '소모품', 10, 1),
  ('기타 판관비', '사무실 비품', 10, 2),
  ('기타 판관비', '사무용품', 10, 3),
  ('기타 판관비', '기부·후원', 10, 4),
  ('기타 판관비', '잡손실·기타', 10, 5)
on conflict (group_name, item_name) do nothing;

update overhead_categories
set item_name = '택배·퀵'
where group_name = '물류·운영' and item_name = '택배·퀵 (판관)';
