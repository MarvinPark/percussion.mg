-- 매출 구분 "온라인" 추가 (엑셀 불러오기 기본값)
insert into sale_category_options (name, sort_order)
values ('온라인', 6)
on conflict (name) do nothing;
