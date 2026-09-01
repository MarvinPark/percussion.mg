-- ============================================================
-- 견적 재고 예약
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

alter table quotes
  add column if not exists is_reserved boolean not null default false;

create table if not exists quote_reservations (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  quote_item_id uuid not null references quote_items(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (quote_item_id)
);

create index if not exists quote_reservations_quote_id_idx
  on quote_reservations (quote_id);

create index if not exists quote_reservations_product_id_idx
  on quote_reservations (product_id);

alter table quote_reservations enable row level security;

drop policy if exists "로그인 사용자 견적 예약 조회" on quote_reservations;
drop policy if exists "로그인 사용자 견적 예약 등록" on quote_reservations;
drop policy if exists "로그인 사용자 견적 예약 수정" on quote_reservations;
drop policy if exists "로그인 사용자 견적 예약 삭제" on quote_reservations;

create policy "로그인 사용자 견적 예약 조회"
  on quote_reservations for select to authenticated using (true);

create policy "로그인 사용자 견적 예약 등록"
  on quote_reservations for insert to authenticated with check (true);

create policy "로그인 사용자 견적 예약 수정"
  on quote_reservations for update to authenticated using (true);

create policy "로그인 사용자 견적 예약 삭제"
  on quote_reservations for delete to authenticated using (true);
