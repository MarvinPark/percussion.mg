-- 제품 목록 통계 (총 건수 · 총 재고) — 1회 쿼리로 집계
-- Supabase SQL Editor에서 실행

create or replace function public.get_product_list_stats(search_query text default null)
returns table (total_count bigint, total_stock_quantity numeric)
language plpgsql
stable
security invoker
as $$
declare
  pattern text;
begin
  if search_query is null or btrim(search_query) = '' then
    return query
    select count(*)::bigint, coalesce(sum(stock_quantity), 0)::numeric
    from products;
  end if;

  pattern := '%' || search_query || '%';

  return query
  select count(*)::bigint, coalesce(sum(stock_quantity), 0)::numeric
  from products
  where supplier ilike pattern
     or category ilike pattern
     or brand ilike pattern
     or product_name ilike pattern
     or model_name ilike pattern
     or sku ilike pattern
     or keywords ilike pattern;
end;
$$;

grant execute on function public.get_product_list_stats(text) to authenticated;
