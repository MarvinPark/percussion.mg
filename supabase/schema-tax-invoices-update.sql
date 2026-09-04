-- ============================================================
-- 세금계산서 발행 내역 확장 (다품목·상태·취소)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

alter table tax_invoice_issues
  add column if not exists detail_items jsonb not null default '[]'::jsonb;

alter table tax_invoice_issues
  add column if not exists popbill_state text;

alter table tax_invoice_issues
  add column if not exists cancelled_at timestamptz;

alter table tax_invoice_issues
  add column if not exists cancel_memo text;
