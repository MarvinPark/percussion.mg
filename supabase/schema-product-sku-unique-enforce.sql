-- ============================================================
-- products_unique_sku 유니크 인덱스를 실제로 적용
-- Supabase SQL Editor → New query → 붙여넣기 → Run
--
-- products_unique_sku 는 schema.sql / deploy-all.sql 에 이미 있지만,
-- 중복 SKU가 남은 상태에서는 인덱스 생성이 실패합니다.
-- `if not exists` 는 "인덱스가 이미 있으면 건너뛴다"는 뜻일 뿐이라
-- 중복 때문에 실패한 경우를 막아주지 못합니다. 그래서 정의만 있고
-- 실제로는 걸려 있지 않은 상태가 될 수 있습니다.
--
-- 이 스크립트는 중복이 있으면 목록을 보여주고 멈추고,
-- 중복이 없으면 인덱스를 만든 뒤 적용 여부까지 확인합니다.
-- 여러 번 실행해도 안전합니다.
-- ============================================================

-- 1) 중복 SKU가 남아 있으면 목록과 함께 중단
do $$
declare
  dup_count int;
  dup_list  text;
begin
  select count(*)
    into dup_count
  from (
    select sku
    from products
    where sku is not null
      and btrim(sku) <> ''
    group by sku
    having count(*) > 1
  ) d;

  if dup_count > 0 then
    select string_agg(sku || ' (' || cnt || '건)', ', ')
      into dup_list
    from (
      select sku, count(*) as cnt
      from products
      where sku is not null
        and btrim(sku) <> ''
      group by sku
      having count(*) > 1
      order by count(*) desc, sku
      limit 20
    ) d;

    raise exception
      '중복 SKU가 %종 남아 있어 유니크 인덱스를 만들 수 없습니다. 먼저 정리한 뒤 다시 실행해 주세요. 예: %',
      dup_count, dup_list;
  end if;
end $$;

-- 2) 인덱스 생성
create unique index if not exists products_unique_sku
  on products (sku);

-- 3) 실제로 걸렸는지 확인
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'products'
      and indexname = 'products_unique_sku'
  ) then
    raise exception 'products_unique_sku 인덱스가 만들어지지 않았습니다.';
  end if;

  raise notice 'products_unique_sku 적용 완료 — 이제 같은 SKU가 두 번 등록되지 않습니다.';
end $$;
