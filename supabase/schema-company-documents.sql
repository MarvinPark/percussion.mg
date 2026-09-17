-- ============================================================
-- 회사 문서 보관 (사업자등록증, 통장사본 등)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

create table if not exists company_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size integer not null default 0 check (file_size >= 0),
  expires_at date,
  note text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_documents_title_idx
  on company_documents (title);

create index if not exists company_documents_expires_at_idx
  on company_documents (expires_at nulls last);

alter table company_documents enable row level security;

drop policy if exists "로그인 사용자 회사 문서 조회" on company_documents;
drop policy if exists "로그인 사용자 회사 문서 등록" on company_documents;
drop policy if exists "로그인 사용자 회사 문서 수정" on company_documents;
drop policy if exists "로그인 사용자 회사 문서 삭제" on company_documents;

create policy "로그인 사용자 회사 문서 조회"
  on company_documents for select to authenticated
  using (true);

create policy "로그인 사용자 회사 문서 등록"
  on company_documents for insert to authenticated
  with check (true);

create policy "로그인 사용자 회사 문서 수정"
  on company_documents for update to authenticated
  using (true);

create policy "로그인 사용자 회사 문서 삭제"
  on company_documents for delete to authenticated
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-documents',
  'company-documents',
  false,
  15728640,
  null
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = null;
