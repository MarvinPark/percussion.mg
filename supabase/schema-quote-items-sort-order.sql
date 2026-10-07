-- 견적 품목 표시/저장 순서 (수정 저장 시 delete+insert 후에도 유지)
alter table quote_items
  add column if not exists sort_order integer not null default 0;

-- 기존 데이터: quote_id 내 id 순으로 임시 순서 부여 (마이그레이션 1회)
with ranked as (
  select
    id,
    row_number() over (partition by quote_id order by id) - 1 as rn
  from quote_items
)
update quote_items qi
set sort_order = ranked.rn
from ranked
where qi.id = ranked.id;

create index if not exists quote_items_quote_sort_idx
  on quote_items (quote_id, sort_order);
