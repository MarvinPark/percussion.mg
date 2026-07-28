-- ============================================================
-- 3단계: 입고/출고 + 재고 변동 이력
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- (1~2단계 schema.sql을 이미 실행했다면 이 파일만 추가 실행)
-- ============================================================

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out', 'adjust')),
  quantity integer not null check (quantity >= 0),
  stock_before integer not null,
  stock_after integer not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_id_idx
  on stock_movements (product_id);

create index if not exists stock_movements_created_at_idx
  on stock_movements (created_at desc);

alter table stock_movements enable row level security;

create policy "로그인 사용자 재고 이력 조회"
  on stock_movements for select to authenticated using (true);

create policy "로그인 사용자 재고 이력 등록"
  on stock_movements for insert to authenticated with check (true);
