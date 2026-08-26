-- ============================================================
-- 거래처: 세금계산서 공급받는자 필드 확장
-- (schema-business-partners.sql 실행 후 추가 실행)
-- ============================================================

alter table business_partners
  drop constraint if exists business_partners_partner_type_check;

alter table business_partners
  add constraint business_partners_partner_type_check
  check (partner_type in ('business', 'individual', 'foreigner'));

alter table business_partners
  add column if not exists invoice_tax_reg_id text;

alter table business_partners
  add column if not exists invoice_contact_name text;

alter table business_partners
  add column if not exists invoice_contact_dept text;

alter table business_partners
  add column if not exists invoice_contact_tel text;

alter table business_partners
  add column if not exists invoice_contact_hp text;

alter table business_partners
  add column if not exists invoice_contact_name2 text;

alter table business_partners
  add column if not exists invoice_contact_dept2 text;

alter table business_partners
  add column if not exists invoice_contact_tel2 text;

alter table business_partners
  add column if not exists invoice_contact_hp2 text;

alter table business_partners
  add column if not exists invoice_contact_email2 text;

alter table business_partners
  add column if not exists memo text;
