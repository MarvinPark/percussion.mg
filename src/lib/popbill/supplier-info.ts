import { TAX_INVOICE_SUPPLIER_EMAIL } from "@/lib/tax-invoice-supplier-email";
import { SUPPLIER_INFO } from "@/types/quote";

export function getPopbillSupplierFields(corpNum: string) {
  const ceoName = SUPPLIER_INFO.representative.replace(/^대표자\s*/, "").trim();

  return {
    invoicerCorpNum: corpNum,
    invoicerCorpName: SUPPLIER_INFO.companyName,
    invoicerCEOName: ceoName,
    invoicerAddr: SUPPLIER_INFO.address,
    invoicerBizType: "도소매",
    invoicerBizClass: "악기",
    invoicerContactName: "전인철",
    invoicerTEL: SUPPLIER_INFO.phone,
    invoicerEmail: TAX_INVOICE_SUPPLIER_EMAIL,
  };
}
