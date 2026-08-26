-- ============================================================
-- 거래처 마스터 (세금계산서 공급받는자 정보 포함)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

create table if not exists business_partners (
  id uuid primary key default gen_random_uuid(),
  partner_type text not null default 'individual'
    check (partner_type in ('business', 'individual', 'foreigner')),
  display_name text not null,
  contact_name text,
  contact_phone text,
  contact_email text,
  contact_address text,
  corp_num text,
  corp_name text,
  ceo_name text,
  biz_type text,
  biz_class text,
  invoice_address text,
  invoice_email text,
  invoice_tax_reg_id text,
  invoice_contact_name text,
  invoice_contact_dept text,
  invoice_contact_tel text,
  invoice_contact_hp text,
  invoice_contact_name2 text,
  invoice_contact_dept2 text,
  invoice_contact_tel2 text,
  invoice_contact_hp2 text,
  invoice_contact_email2 text,
  memo text,
  invoice_ready boolean not null default false,
  source text not null default 'manual'
    check (source in ('manual', 'quote', 'sale')),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists business_partners_corp_num_unique
  on business_partners (corp_num)
  where corp_num is not null and corp_num <> '';

create index if not exists business_partners_display_name_idx
  on business_partners (display_name);

create index if not exists business_partners_last_used_at_idx
  on business_partners (last_used_at desc nulls last);

alter table business_partners enable row level security;

drop policy if exists "로그인 사용자 거래처 조회" on business_partners;
drop policy if exists "로그인 사용자 거래처 등록" on business_partners;
drop policy if exists "로그인 사용자 거래처 수정" on business_partners;
drop policy if exists "로그인 사용자 거래처 삭제" on business_partners;

create policy "로그인 사용자 거래처 조회"
  on business_partners for select to authenticated
  using (true);

create policy "로그인 사용자 거래처 등록"
  on business_partners for insert to authenticated
  with check (true);

create policy "로그인 사용자 거래처 수정"
  on business_partners for update to authenticated
  using (true);

create policy "로그인 사용자 거래처 삭제"
  on business_partners for delete to authenticated
  using (true);

alter table quotes
  add column if not exists partner_id uuid references business_partners(id) on delete set null;

alter table sales
  add column if not exists partner_id uuid references business_partners(id) on delete set null;

create index if not exists quotes_partner_id_idx on quotes (partner_id);
create index if not exists sales_partner_id_idx on sales (partner_id);

insert into role_permission_grants (role, permission) values
  ('admin', 'viewPartners'),
  ('admin', 'managePartners'),
  ('manager', 'viewPartners'),
  ('manager', 'managePartners'),
  ('employee', 'viewPartners'),
  ('employee', 'managePartners')
on conflict (role, permission) do nothing;
