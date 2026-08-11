-- 견적 항목에 색상/옵션/사이즈 스냅샷 추가
-- Supabase SQL Editor → New query → 붙여넣기 → Run

alter table quote_items add column if not exists color text;
alter table quote_items add column if not exists product_option text;
alter table quote_items add column if not exists size text;
