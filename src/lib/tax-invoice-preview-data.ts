import { buildDetailListFromItemNames, splitVatInclusive } from "@/lib/popbill/taxinvoice";
import { isoDateToPopbillDate } from "@/lib/tax-invoice-dates";
import type { BusinessPartner } from "@/types/business-partner";
import type { TaxInvoiceIssue, TaxInvoicePurposeType } from "@/types/tax-invoice";
import { SUPPLIER_INFO } from "@/types/quote";

export type TaxInvoicePreviewParty = {
  corpNum: string;
  corpName: string;
  ceoName: string;
  address: string;
  bizType: string;
  bizClass: string;
  email: string;
  tel: string;
  contactName: string;
};

export type TaxInvoicePreviewItem = {
  monthDay: string;
  name: string;
  spec: string;
  qty: string;
  unitCost: number;
  supplyCost: number;
  tax: number;
  remark: string;
};

export type TaxInvoicePreviewData = {
  writeDateLabel: string;
  itemPurchaseDateLabel: string;
  purposeType: TaxInvoicePurposeType;
  supplier: TaxInvoicePreviewParty;
  buyer: TaxInvoicePreviewParty;
  items: TaxInvoicePreviewItem[];
  supplyCostTotal: number;
  taxTotal: number;
  totalAmount: number;
  remark: string;
};

function formatCorpNum(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 10) return value || "-";
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function formatIsoDateLabel(isoDate: string) {
  if (!isoDate) return "-";
  const normalized = isoDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return isoDate;
  const [year, month, day] = normalized.split("-");
  return `${year}년 ${month}월 ${day}일`;
}

function formatMonthDayFromPopbillDate(value: string) {
  if (!value || value.length < 4) return "-";
  const month = value.length >= 6 ? value.slice(4, 6) : value.slice(0, 2);
  const day = value.length >= 8 ? value.slice(6, 8) : value.slice(2, 4);
  return `${month}/${day}`;
}

function buildSupplierParty(corpNum: string): TaxInvoicePreviewParty {
  return {
    corpNum: formatCorpNum(corpNum || SUPPLIER_INFO.businessNumber),
    corpName: SUPPLIER_INFO.companyName,
    ceoName: SUPPLIER_INFO.representative.replace(/^대표자\s*/, "").trim(),
    address: SUPPLIER_INFO.address,
    bizType: "도소매",
    bizClass: "악기",
    email: SUPPLIER_INFO.email,
    tel: SUPPLIER_INFO.phone,
    contactName: "전인철",
  };
}

function buildBuyerParty(
  partner: BusinessPartner | null,
  fallbackName: string,
  emailOverride?: string,
): TaxInvoicePreviewParty {
  const corpName = partner?.corp_name?.trim() || partner?.display_name || fallbackName;
  return {
    corpNum: formatCorpNum(partner?.corp_num ?? ""),
    corpName,
    ceoName: partner?.ceo_name?.trim() || "-",
    address:
      partner?.invoice_address?.trim() ||
      partner?.contact_address?.trim() ||
      "-",
    bizType: partner?.biz_type?.trim() || "-",
    bizClass: partner?.biz_class?.trim() || "-",
    email:
      emailOverride?.trim() ||
      partner?.invoice_email?.trim() ||
      partner?.contact_email?.trim() ||
      "-",
    tel: partner?.invoice_contact_tel?.trim() || partner?.contact_phone?.trim() || "-",
    contactName: partner?.invoice_contact_name?.trim() || partner?.contact_name?.trim() || "-",
  };
}

export function buildTaxInvoicePreviewData(input: {
  partner: BusinessPartner | null;
  displayName: string;
  totalAmount: number;
  itemNames: string[];
  writeDate: string;
  itemPurchaseDate: string;
  purposeType: TaxInvoicePurposeType;
  supplierCorpNum: string;
  buyerEmail?: string;
}): TaxInvoicePreviewData {
  const purchaseDate = isoDateToPopbillDate(input.itemPurchaseDate);
  const detailList = buildDetailListFromItemNames(
    input.itemNames,
    input.totalAmount,
    purchaseDate,
  );
  const { supplyCost, tax, totalAmount } = splitVatInclusive(input.totalAmount);

  return {
    writeDateLabel: formatIsoDateLabel(input.writeDate),
    itemPurchaseDateLabel: formatIsoDateLabel(input.itemPurchaseDate),
    purposeType: input.purposeType,
    supplier: buildSupplierParty(input.supplierCorpNum),
    buyer: buildBuyerParty(input.partner, input.displayName, input.buyerEmail),
    items: detailList.map((item) => ({
      monthDay: formatMonthDayFromPopbillDate(item.purchaseDT),
      name: item.itemName,
      spec: item.spec ?? "",
      qty: item.qty,
      unitCost: Number(item.unitCost) || 0,
      supplyCost: Number(item.supplyCost) || 0,
      tax: Number(item.tax) || 0,
      remark: item.remark ?? "",
    })),
    supplyCostTotal: supplyCost,
    taxTotal: tax,
    totalAmount,
    remark: "",
  };
}

export function buildTaxInvoicePreviewDataFromIssue(
  issue: TaxInvoiceIssue,
  partner?: BusinessPartner | null,
): TaxInvoicePreviewData {
  const itemNames =
    issue.detail_items.length > 0
      ? issue.detail_items.map((item) => item.name)
      : [issue.item_name || "악기"];

  const preview = buildTaxInvoicePreviewData({
    partner: partner ?? null,
    displayName: issue.partner_name,
    totalAmount: issue.total_amount,
    itemNames,
    writeDate: issue.write_date,
    itemPurchaseDate: issue.item_purchase_date,
    purposeType: issue.purpose_type,
    supplierCorpNum: "",
    buyerEmail: issue.partner_email ?? undefined,
  });

  if (issue.detail_items.length > 0) {
    preview.items = issue.detail_items.map((item, index) => ({
      monthDay: preview.items[index]?.monthDay ?? formatMonthDayFromPopbillDate(
        isoDateToPopbillDate(issue.item_purchase_date),
      ),
      name: item.name,
      spec: "",
      qty: "1",
      unitCost: item.supply_cost,
      supplyCost: item.supply_cost,
      tax: item.tax_amount,
      remark: "",
    }));
  }

  return preview;
}

export function createTaxInvoiceItemId() {
  return `ti-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
