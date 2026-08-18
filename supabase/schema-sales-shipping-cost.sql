-- sales: 업체 직발송 등 업체 청구 배송비 (마진 차감용, 재고 무관)
alter table sales
  add column if not exists shipping_cost numeric(12, 0) not null default 0;
