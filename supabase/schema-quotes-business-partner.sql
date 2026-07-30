-- 견적서: 거래처명
-- Supabase SQL Editor → New query → 붙여넣기 → Run

alter table quotes
  add column if not exists business_partner text;
