-- ============================================================
-- 견적 매출전환 추적: sales.quote_id
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

alter table sales
  add column if not exists quote_id uuid references quotes(id) on delete set null;

create index if not exists sales_quote_id_idx on sales (quote_id);
