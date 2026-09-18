-- 제품 목록 통계 (총 건수 · 총 재고) — 1회 쿼리로 집계
-- Supabase SQL Editor에서 실행

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
begin
  if search_query is null or btrim(search_query) = '' then
    return true;
  end if;

  tokens := array(
    select t
    from unnest(regexp_split_to_array(btrim(search_query), '\s+')) as t
    where char_length(t) >= 2
  );

  if coalesce(array_length(tokens, 1), 0) = 0 then
    if char_length(btrim(search_query)) >= 2 then
      tokens := array[btrim(search_query)];
    else
      return false;
    end if;
  end if;

  foreach token in array tokens loop
    pattern := '%' || public.escape_ilike_pattern(token) || '%';
    if not (
      p.supplier ilike pattern
      or p.category ilike pattern
      or p.brand ilike pattern
      or p.product_name ilike pattern
      or p.model_name ilike pattern
      or p.sku ilike pattern
      or p.keywords ilike pattern
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
begin
  if search_query is null or btrim(search_query) = '' then
    return query
    select count(*)::bigint, coalesce(sum(stock_quantity), 0)::numeric
    from products;
  end if;

  return query
  select count(*)::bigint, coalesce(sum(stock_quantity), 0)::numeric
  from products p
  where public.product_matches_search(p, search_query);
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
