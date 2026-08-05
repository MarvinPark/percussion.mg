export type EsmItemOption = {
  ItemOptionValue?: string | null;
  ItemOptionOrderCnt?: number | null;
  ItemOptionCode?: string | null;
};

export type EsmRequestOrder = {
  OrderNo?: number | string | null;
  PayNo?: number | string | null;
  OrderStatus?: number | null;
  OrderDate?: string | null;
  PayDate?: string | null;
  GoodsName?: string | null;
  SiteGoodsNo?: string | null;
  OutGoodsNo?: string | null;
  SKUNo?: string | null;
  SalePrice?: string | number | null;
  ContrAmount?: number | null;
  OrderAmount?: string | number | null;
  AcntMoney?: string | number | null;
  ServiceFee?: string | number | null;
  BuyerName?: string | null;
  BuyerMobileTel?: string | null;
  ReceiverName?: string | null;
  HpNo?: string | null;
  DelFullAddress?: string | null;
  ItemOptionSelectList?: EsmItemOption[] | null;
  ItemOptionAdditionList?: EsmItemOption[] | null;
};

export type EsmRequestOrdersResponse = {
  ResultCode?: number | null;
  Message?: string | null;
  Data?: {
    SiteType?: number | null;
    PageIndex?: number | null;
    PageSize?: number | null;
    TotalCount?: number | null;
    SellerId?: string | null;
    RequestOrders?: EsmRequestOrder[] | null;
  } | null;
  data?: {
    SiteType?: number | null;
    PageIndex?: number | null;
    PageSize?: number | null;
    TotalCount?: number | null;
    SellerId?: string | null;
    RequestOrders?: EsmRequestOrder[] | null;
  } | null;
};

export type ParsedGmarketOrder = {
  orderLineId: string;
  orderNo: string;
  payNo: string;
  soldAt: string;
  productName: string;
  productOption: string;
  sellerProductCode: string;
  quantity: number;
  totalPaymentAmount: number;
  serviceFee: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderStatus: number | null;
};
