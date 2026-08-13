-- quote_items: 줄별 출고지 (직발송 / 매장)
-- Supabase SQL Editor → New query → 붙여넣기 → Run

alter table quote_items
  add column if not exists fulfillment_location text not null default '매장'
  check (fulfillment_location in ('직발송', '매장'));
