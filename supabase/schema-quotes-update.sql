-- 견적서 폼 업데이트 (기존 DB에 적용)
-- Supabase SQL Editor → New query → 붙여넣기 → Run

alter table quotes alter column customer_phone drop not null;

alter table quotes add column if not exists memo text;
alter table quotes add column if not exists manager_name text;
alter table quotes add column if not exists payment_method_id uuid references payment_methods(id) on delete set null;

-- 이미 policy가 있으면 이 줄은 건너뛰세요.
-- create policy "로그인 사용자 견적 수정"
--   on quotes for update to authenticated using (true);
