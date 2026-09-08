-- 견적 할인 금액 (헤더 저장, 품목 행 아님)
-- Supabase SQL Editor → New query → 붙여넣기 → Run

alter table quotes
  add column if not exists discount_amount numeric(12, 0) not null default 0;
