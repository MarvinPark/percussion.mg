-- 프로필에 직함 추가
-- Supabase SQL Editor → Run

alter table profiles
  add column if not exists job_title text;
