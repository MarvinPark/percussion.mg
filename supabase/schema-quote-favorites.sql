-- ============================================================
-- 견적 즐겨찾기 (PC·모바일 동기화)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

create table if not exists quote_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  quote_id uuid not null references quotes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, quote_id)
);

create index if not exists quote_favorites_user_id_idx on quote_favorites (user_id);

alter table quote_favorites enable row level security;

drop policy if exists "본인 견적 즐겨찾기 조회" on quote_favorites;
drop policy if exists "본인 견적 즐겨찾기 추가" on quote_favorites;
drop policy if exists "본인 견적 즐겨찾기 삭제" on quote_favorites;

create policy "본인 견적 즐겨찾기 조회"
  on quote_favorites for select to authenticated
  using (auth.uid() = user_id);

create policy "본인 견적 즐겨찾기 추가"
  on quote_favorites for insert to authenticated
  with check (auth.uid() = user_id);

create policy "본인 견적 즐겨찾기 삭제"
  on quote_favorites for delete to authenticated
  using (auth.uid() = user_id);
