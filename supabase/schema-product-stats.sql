-- 제품 목록 통계 (총 건수 · 총 재고) — 1회 쿼리로 집계
-- Supabase SQL Editor에서 실행
-- (매개변수 이름은 기존 함수와 동일해야 CREATE OR REPLACE 가능)

create or replace function public.escape_ilike_pattern(value text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(replace(btrim(value), '\', '\\'), '%', '\%'), '_', '\_'), '*', '\*');
$$;

create or replace function public.product_matches_search(p products, search_query text)
returns boolean
language plpgsql
immutable
as $$
declare
  tokens text[];
  token text;
  pattern text;
  query_text text;
begin
  query_text := search_query;

  if query_text is null or btrim(query_text) = '' then
    return true;
  end if;

  tokens := array(
    select t
    from unnest(regexp_split_to_array(btrim(query_text), '\s+')) as t
    where char_length(t) >= 2
  );

  if coalesce(array_length(tokens, 1), 0) = 0 then
    if char_length(btrim(query_text)) >= 2 then
      tokens := array[btrim(query_text)];
    else
      return false;
    end if;
  end if;

  foreach token in array tokens loop
    pattern := '%' || public.escape_ilike_pattern(token) || '%';
    if not (
      coalesce(p.supplier, '') ilike pattern
      or coalesce(p.category, '') ilike pattern
      or coalesce(p.brand, '') ilike pattern
      or coalesce(p.product_name, '') ilike pattern
      or coalesce(p.model_name, '') ilike pattern
      or coalesce(p.sku, '') ilike pattern
      or coalesce(p.keywords, '') ilike pattern
    ) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.get_product_list_stats(search_query text default null)
returns table (total_count bigint, total_stock_quantity numeric)
language plpgsql
stable
security invoker
as $$
declare
  query_text text;
begin
  query_text := search_query;

  if query_text is null or btrim(query_text) = '' then
    return query
    select count(*)::bigint, coalesce(sum(stock_quantity), 0)::numeric
    from products;
  end if;

  return query
  select count(*)::bigint, coalesce(sum(stock_quantity), 0)::numeric
  from products p
  where public.product_matches_search(p, query_text);
end;
$$;

grant execute on function public.get_product_list_stats(text) to authenticated;

create or replace function public.get_total_inventory_asset()
returns numeric
language sql
stable
security invoker
as $$
  select coalesce(sum(purchase_price * stock_quantity), 0)::numeric
  from products;
$$;

grant execute on function public.get_total_inventory_asset() to authenticated;
