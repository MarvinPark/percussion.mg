-- ============================================================
-- 4단계: 사용자 프로필 + 변동 이력 수정자
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- (schema.sql, schema-phase3.sql 실행 후 이 파일 실행)
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "로그인 사용자 프로필 조회"
  on profiles for select to authenticated using (true);

create policy "본인 프로필 등록"
  on profiles for insert to authenticated with check (auth.uid() = id);

create policy "본인 프로필 수정"
  on profiles for update to authenticated using (auth.uid() = id);

alter table stock_movements
  add column if not exists modified_by_user_id uuid references auth.users(id) on delete set null;

alter table stock_movements
  add column if not exists modified_by_name text;

-- 기존 가입 사용자 프로필 (현재 1명: 전인철)
insert into profiles (id, full_name, phone)
select id, '전인철', '010-0000-0000'
from auth.users
on conflict (id) do update
set full_name = excluded.full_name,
    phone = excluded.phone,
    updated_at = now();
