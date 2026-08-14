-- PERCY 월간 사용량 (앱 자체 지표)
-- Supabase SQL Editor에서 실행

create table if not exists app_usage_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  amount integer not null default 1 check (amount > 0),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists app_usage_events_type_created_idx
  on app_usage_events (event_type, created_at desc);

alter table app_usage_events enable row level security;

drop policy if exists "로그인 사용자 사용량 기록" on app_usage_events;
create policy "로그인 사용자 사용량 기록"
  on app_usage_events for insert to authenticated
  with check (user_id is null or auth.uid() = user_id);

drop policy if exists "로그인 사용자 사용량 조회" on app_usage_events;
create policy "로그인 사용자 사용량 조회"
  on app_usage_events for select to authenticated using (true);

create or replace function public.get_database_size_bytes()
returns bigint
language sql
stable
security invoker
as $$
  select pg_database_size(current_database());
$$;

grant execute on function public.get_database_size_bytes() to authenticated;

create or replace function public.get_app_monthly_usage()
returns json
language plpgsql
stable
security invoker
as $$
declare
  month_start timestamptz := date_trunc(
    'month',
    timezone('Asia/Seoul', now())
  ) at time zone 'Asia/Seoul';
  result json;
begin
  select json_build_object(
    'product_registers',
      coalesce((
        select count(*)::bigint
        from products
        where created_at >= month_start
      ), 0),
    'sales',
      coalesce((
        select count(*)::bigint
        from sales
        where created_at >= month_start
      ), 0),
    'quotes',
      coalesce((
        select count(*)::bigint
        from quotes
        where created_at >= month_start
      ), 0),
    'excel_downloads',
      coalesce((
        select sum(amount)::bigint
        from app_usage_events
        where event_type = 'excel_download'
          and created_at >= month_start
      ), 0),
    'excel_import_rows',
      coalesce((
        select sum(amount)::bigint
        from app_usage_events
        where event_type = 'excel_import'
          and created_at >= month_start
      ), 0),
    'database_bytes',
      public.get_database_size_bytes()
  )
  into result;

  return result;
end;
$$;

grant execute on function public.get_app_monthly_usage() to authenticated;
