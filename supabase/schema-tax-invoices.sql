-- ============================================================
-- 세금계산서 발행 내역
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

create table if not exists tax_invoice_issues (
  id uuid primary key default gen_random_uuid(),
  mgt_key text not null,
  partner_id uuid references business_partners(id) on delete set null,
  partner_name text not null,
  partner_corp_num text,
  partner_email text,
  sale_ids uuid[] not null default '{}',
  sale_count integer not null default 0,
  item_name text not null,
  purpose_type text not null check (purpose_type in ('영수', '청구')),
  write_date date not null,
  item_purchase_date date not null,
  total_amount numeric not null,
  supply_cost numeric not null,
  tax_amount numeric not null,
  nts_confirm_num text,
  popbill_code integer,
  popbill_message text,
  issued_by_user_id uuid references auth.users(id) on delete set null,
  issued_by_name text,
  is_test boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists tax_invoice_issues_mgt_key_unique
  on tax_invoice_issues (mgt_key);

create index if not exists tax_invoice_issues_created_at_idx
  on tax_invoice_issues (created_at desc);

create index if not exists tax_invoice_issues_partner_id_idx
  on tax_invoice_issues (partner_id);

alter table tax_invoice_issues enable row level security;

drop policy if exists "로그인 사용자 세금계산서 발행 조회" on tax_invoice_issues;
drop policy if exists "로그인 사용자 세금계산서 발행 등록" on tax_invoice_issues;

create policy "로그인 사용자 세금계산서 발행 조회"
  on tax_invoice_issues for select to authenticated
  using (true);

create policy "로그인 사용자 세금계산서 발행 등록"
  on tax_invoice_issues for insert to authenticated
  with check (true);
