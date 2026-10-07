"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { findQuoteProductForAdd } from "@/app/(main)/quotes/actions";
import { createSale } from "@/app/(main)/sales/actions";
import InlineProductCreateModal from "@/components/inline-product-create-modal";
import ModelNameAutocomplete, {
  type ModelNameAutocompleteHandle,
} from "@/components/model-name-autocomplete";
import { toSaleProductOption } from "@/lib/inline-product-create-shared";
import PhoneInput from "@/components/phone-input";
import PaymentMethodCombobox from "@/components/payment-method-combobox";
import PriceInput from "@/components/price-input";
import SaleCategorySelect from "@/components/sale-category-select";
import SaleCustomerAutocomplete from "@/components/sale-customer-autocomplete";
import BusinessPartnerAutocomplete from "@/components/business-partner-autocomplete";
import { getPartnerCustomerFields } from "@/lib/business-partners";
import {
  calculateSaleAmounts,
  formatKRW,
  marginAmountClass,
} from "@/lib/sales-calculator";
import {
  DEFAULT_FULFILLMENT_LOCATION,
  FULFILLMENT_LOCATIONS,
  type FulfillmentLocation,
} from "@/lib/quote-fulfillment";
import type { SaleContactSuggestions } from "@/lib/sale-contact-suggestions";
import { useLivePaymentMethods } from "@/hooks/use-live-payment-methods";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { getDefaultPaymentMethodId } from "@/lib/payment-methods";
import {
  computeNegativeStockApprovals,
  type SaleStockApprovalItem,
} from "@/lib/sale-stock-approval";
import { isSaleFormDirty } from "@/lib/unsaved-form-dirty";
import SaleStockApprovalDialog from "@/components/sale-stock-approval-dialog";
import type { QuoteProductOption } from "@/types/quote";
import type { PaymentMethod, SaleProductOption } from "@/types/sale";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400";

const tableInputClass =
  "w-full min-w-[4rem] rounded border border-zinc-400 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

const bulkBarLabelClass =
  "shrink-0 text-xs font-semibold text-zinc-700 dark:text-zinc-300";

const bulkBarInputClass =
  "h-[34px] rounded border border-zinc-400 bg-white px-2 text-base text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const mobileFieldInputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const mobileFieldLabelClass =
  "mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300";

const bulkBarButtonClass =
  "inline-flex h-[34px] shrink-0 items-center rounded border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const addProductInputClass =
  "w-full rounded border border-zinc-200/70 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 sm:px-2 sm:py-1.5 sm:text-sm dark:border-zinc-600/50 dark:bg-white dark:text-zinc-900 dark:focus:border-blue-500";

function quoteProductToSale(product: QuoteProductOption): SaleProductOption {
  return {
    id: product.id,
    product_name: product.product_name,
    model_name: product.model_name,
    sku: product.sku,
    category: product.category,
    brand: product.brand,
    supplier: product.supplier,
    sale_price: product.sale_price,
    purchase_price: product.purchase_price,
    stock_quantity: product.stock_quantity ?? 0,
    stock_yangjae: product.stock_yangjae,
    stock_uiwang: product.stock_uiwang,
    reserved_quantity: product.reserved_quantity,
  };
}

type SaleFormProps = {
  paymentMethods: PaymentMethod[];
  contactSuggestions: SaleContactSuggestions;
  saleCategories: string[];
  nonStockCategories: string[];
};

type SaleLineDraft = {
  id: string;
  productId: string;
  quantity: number;
  unitSalePrice: number;
  unitPurchasePrice: number;
  paymentMethodId: string;
  fulfillmentLocation: FulfillmentLocation;
  shippingCost: number;
};

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function linePreview(
  line: SaleLineDraft,
  paymentMethods: PaymentMethod[],
) {
  const payment = paymentMethods.find(
    (method) => method.id === line.paymentMethodId,
  );
  return calculateSaleAmounts({
    quantity: line.quantity,
    unitSalePrice: line.unitSalePrice,
    unitPurchasePrice: line.unitPurchasePrice,
    feeRate: payment?.fee_rate ?? 0,
    shippingCost: line.shippingCost,
  });
}

function validateSaleLines(lines: SaleLineDraft[]): string | null {
  const activeLines = lines.filter((line) => line.productId);
  if (activeLines.length === 0) {
    return "판매 제품을 1개 이상 추가해 주세요.";
  }

  for (let index = 0; index < activeLines.length; index += 1) {
    const line = activeLines[index];
    const lineNumber = index + 1;

    if (!line.paymentMethodId) {
      return `${lineNumber}번째 줄: 결제 방식을 선택해 주세요.`;
    }
    if (!line.quantity || line.quantity <= 0) {
      return `${lineNumber}번째 줄: 수량은 1 이상 입력해 주세요.`;
    }
    if (line.unitSalePrice < 0) {
      return `${lineNumber}번째 줄: 판매단가는 0 이상이어야 합니다.`;
    }
    if (line.unitPurchasePrice < 0) {
      return `${lineNumber}번째 줄: 매입가는 0 이상이어야 합니다.`;
    }
  }

  return null;
}

export default function SaleForm({
  paymentMethods,
  contactSuggestions,
  saleCategories,
  nonStockCategories,
}: SaleFormProps) {
  const router = useRouter();
  const livePaymentMethods = useLivePaymentMethods(paymentMethods);
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [selectedProductsByLine, setSelectedProductsByLine] = useState<
    Record<string, SaleProductOption>
  >({});
  const [modelSearch, setModelSearch] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<SaleProductOption | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [addSalePrice, setAddSalePrice] = useState(0);
  const [addPurchasePrice, setAddPurchasePrice] = useState(0);
  const [isResolvingProduct, setIsResolvingProduct] = useState(false);
  const modelInputRef = useRef<ModelNameAutocompleteHandle>(null);
  const [productCreateQuery, setProductCreateQuery] = useState<string | null>(
    null,
  );
  const [bulkPaymentMethodId, setBulkPaymentMethodId] = useState(
    () => getDefaultPaymentMethodId(paymentMethods),
  );
  const [bulkQuantity, setBulkQuantity] = useState(1);
  const [businessPartner, setBusinessPartner] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [soldAt, setSoldAt] = useState(() => todayString());
  const [saleCategory, setSaleCategory] = useState(
    () => saleCategories[0] ?? "",
  );
  const [note, setNote] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [stockApprovalItems, setStockApprovalItems] = useState<
    SaleStockApprovalItem[] | null
  >(null);
  const stockApprovalBypassRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      return (await createSale(formData)) ?? null;
    },
    null,
  );

  const linesJson = useMemo(
    () =>
      JSON.stringify(
        lines
          .filter((line) => line.productId)
          .map((line) => ({
            product_id: line.productId,
            quantity: line.quantity,
            unit_sale_price: line.unitSalePrice,
            unit_purchase_price: line.unitPurchasePrice,
            payment_method_id: line.paymentMethodId,
            fulfillment_location: line.fulfillmentLocation,
            shipping_cost: line.shippingCost,
          })),
      ),
    [lines],
  );

  const totals = useMemo(() => {
    let totalAmount = 0;
    let paymentFeeAmount = 0;
    let marginAmount = 0;

    for (const line of lines) {
      if (!line.productId) continue;
      const preview = linePreview(line, livePaymentMethods);
      totalAmount += preview.totalAmount;
      paymentFeeAmount += preview.paymentFeeAmount;
      marginAmount += preview.marginAmount;
    }

    return { totalAmount, paymentFeeAmount, marginAmount };
  }, [lines, livePaymentMethods]);

  const hasValidLine = lines.some((line) => line.productId);

  const isDirty = useMemo(
    () =>
      isSaleFormDirty({
        businessPartner,
        customerName,
        customerPhone,
        customerAddress,
        note,
        lines,
      }),
    [
      businessPartner,
      customerName,
      customerPhone,
      customerAddress,
      note,
      lines,
    ],
  );

  const { dialog: leaveDialog, allowNavigation } = useUnsavedChangesGuard(
    isDirty && !isPending && !state?.success,
  );

  function buildStockApprovalLines() {
    return lines
      .filter((line) => line.productId)
      .map((line) => {
        const product = selectedProductsByLine[line.id];

        return {
          id: line.id,
          product_id: line.productId,
          model_name: product?.model_name ?? "",
          product_name: product?.product_name ?? "",
          category: product?.category,
          quantity: line.quantity,
          fulfillment_location: line.fulfillmentLocation,
          stock_quantity: product?.stock_quantity,
          stock_yangjae: product?.stock_yangjae,
          stock_uiwang: product?.stock_uiwang,
          reserved_quantity: product?.reserved_quantity,
        };
      });
  }

  function submitSaleForm() {
    const form = formRef.current;
    if (!form) return;

    formAction(new FormData(form));
  }

  function attemptSubmitSaleForm() {
    if (!stockApprovalBypassRef.current) {
      const approvalItems = computeNegativeStockApprovals(
        buildStockApprovalLines(),
        nonStockCategories,
      );

      if (approvalItems.length > 0) {
        setStockApprovalItems(approvalItems);
        return;
      }
    }

    stockApprovalBypassRef.current = false;
    submitSaleForm();
  }

  useEffect(() => {
    if (!state?.success) return;
    allowNavigation();
    router.replace("/sales");
  }, [allowNavigation, state?.success, router]);

  function updateLine(id: string, patch: Partial<SaleLineDraft>) {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function focusModelInput() {
    requestAnimationFrame(() => {
      modelInputRef.current?.focus();
    });
  }

  function handleProductPick(product: SaleProductOption) {
    setSelectedProduct(product);
    setAddSalePrice(product.sale_price);
    setAddPurchasePrice(product.purchase_price);
  }

  function handleRegisterProductFromSearch(query: string) {
    setProductCreateQuery(query);
  }

  function handleSaleProductCreated(product: SaleProductOption) {
    setModelSearch(product.model_name || product.sku || "");
    handleProductPick(product);
    setProductCreateQuery(null);
    focusModelInput();
  }

  async function resolveProductForAdd(): Promise<SaleProductOption | null> {
    if (selectedProduct) return selectedProduct;

    const query = modelSearch.trim();
    if (!query) return null;

    const { product } = await findQuoteProductForAdd(query);
    return product ? quoteProductToSale(product) : null;
  }

  async function addItem() {
    if (isResolvingProduct) return;

    setIsResolvingProduct(true);
    let product: SaleProductOption | null = null;
    try {
      product = await resolveProductForAdd();
    } finally {
      setIsResolvingProduct(false);
    }

    if (!product || addQuantity <= 0) {
      alert("모델명을 입력하고 목록에서 제품을 선택해 주세요.");
      return;
    }

    const existing = lines.find((line) => line.productId === product!.id);
    if (existing) {
      updateLine(existing.id, {
        quantity: existing.quantity + addQuantity,
        unitSalePrice: addSalePrice,
        unitPurchasePrice: addPurchasePrice,
      });
    } else {
      const newLine: SaleLineDraft = {
        id: crypto.randomUUID(),
        productId: product.id,
        quantity: addQuantity,
        unitSalePrice: addSalePrice,
        unitPurchasePrice: addPurchasePrice,
        paymentMethodId:
          bulkPaymentMethodId || getDefaultPaymentMethodId(livePaymentMethods),
        fulfillmentLocation: DEFAULT_FULFILLMENT_LOCATION,
        shippingCost: 0,
      };
      setSelectedProductsByLine((prev) => ({
        ...prev,
        [newLine.id]: product!,
      }));
      setLines((prev) => [...prev, newLine]);
    }

    setModelSearch("");
    setSelectedProduct(null);
    setAddQuantity(1);
    setAddSalePrice(0);
    setAddPurchasePrice(0);
    focusModelInput();
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((line) => line.id !== id));
    setSelectedProductsByLine((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function applyBulkPaymentMethod() {
    if (!bulkPaymentMethodId) return;

    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        paymentMethodId: bulkPaymentMethodId,
      })),
    );
  }

  function applyBulkQuantity() {
    if (bulkQuantity < 1) return;

    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        quantity: bulkQuantity,
      })),
    );
  }

  const isSubmitting = isPending;

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={(event) => {
          event.preventDefault();

          const validationError = validateSaleLines(lines);
          if (validationError) {
            setClientError(validationError);
            return;
          }

          setClientError(null);
          attemptSubmitSaleForm();
        }}
        className="space-y-5"
      >
      <input type="hidden" name="lines_json" value={linesJson} />
      <input type="hidden" name="purchase_quantities_json" value="[]" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sale_category" className={labelClass}>
            구분 <span className="text-red-500">*</span>
          </label>
          <SaleCategorySelect
            categories={saleCategories}
            value={saleCategory}
            onChange={setSaleCategory}
          />
          <input type="hidden" name="sale_category" value={saleCategory} />
        </div>

        <div>
          <label htmlFor="sold_at" className={labelClass}>
            판매 날짜 <span className="text-red-500">*</span>
          </label>
          <input
            id="sold_at"
            name="sold_at"
            type="date"
            required
            value={soldAt}
            onChange={(event) => setSoldAt(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/30">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          고객 / 거래처 정보
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="business_partner" className={labelClass}>
              거래처명
            </label>
            <BusinessPartnerAutocomplete
              id="business_partner"
              name="business_partner"
              value={businessPartner}
              partnerId={partnerId}
              onChange={setBusinessPartner}
              onPartnerIdChange={setPartnerId}
              onSelectPartner={(partner) => {
                const fields = getPartnerCustomerFields(partner);
                if (fields.customerName) setCustomerName(fields.customerName);
                if (fields.customerPhone) setCustomerPhone(fields.customerPhone);
                if (fields.customerAddress) setCustomerAddress(fields.customerAddress);
              }}
              placeholder="예: OO음악학원"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="customer_name" className={labelClass}>
              고객명
            </label>
            <SaleCustomerAutocomplete
              id="customer_name"
              name="customer_name"
              value={customerName}
              onChange={setCustomerName}
              suggestions={contactSuggestions.customers}
              onSelectCustomer={(customer) => {
                setCustomerPhone(customer.phone);
                setCustomerAddress(customer.address);
              }}
              placeholder="예: 홍길동"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="customer_phone" className={labelClass}>
              전화번호
            </label>
            <PhoneInput
              id="customer_phone"
              name="customer_phone"
              value={customerPhone}
              onChange={setCustomerPhone}
              placeholder="01012345678"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="customer_address" className={labelClass}>
              주소
            </label>
            <input
              id="customer_address"
              name="customer_address"
              value={customerAddress}
              onChange={(event) => setCustomerAddress(event.target.value)}
              placeholder="예: 경기도 성남시 ..."
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <div className="mb-3 flex items-center gap-2">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            제품 추가
          </p>
          <button
            type="button"
            onClick={() => handleRegisterProductFromSearch(modelSearch.trim())}
            className="shrink-0 rounded-lg border border-blue-600 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 sm:px-3 sm:py-1.5 sm:text-sm dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-950"
          >
            제품등록
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className={labelClass}>모델명</label>
            <ModelNameAutocomplete
              ref={modelInputRef}
              value={modelSearch}
              onChange={(value) => {
                setModelSearch(value);
                setSelectedProduct((prev) => {
                  if (!prev) return null;
                  const label = (prev.model_name || prev.sku || "").trim();
                  return value.trim() === label ? prev : null;
                });
              }}
              onSelectProduct={(product) =>
                handleProductPick(quoteProductToSale(product))
              }
              onRegisterProduct={handleRegisterProductFromSearch}
            />
          </div>
          <div className="w-12 shrink-0 sm:w-20">
            <label className={labelClass}>수량</label>
            <input
              type="number"
              min={1}
              value={addQuantity}
              onChange={(event) =>
                setAddQuantity(Math.max(1, Number(event.target.value) || 1))
              }
              className={`${addProductInputClass} text-center tabular-nums`}
            />
          </div>
          <div className="w-36 sm:w-32">
            <label className={labelClass}>판매가</label>
            <PriceInput
              min={0}
              value={addSalePrice}
              onChange={setAddSalePrice}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addItem();
                }
              }}
              className={addProductInputClass}
            />
          </div>
          <div className="w-28 shrink-0 sm:w-32">
            <label className={labelClass}>매입가</label>
            <PriceInput
              min={0}
              value={addPurchasePrice}
              onChange={setAddPurchasePrice}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addItem();
                }
              }}
              className={addProductInputClass}
            />
          </div>
          <button
            type="button"
            onClick={() => void addItem()}
            disabled={isResolvingProduct}
            className="ml-auto rounded-lg bg-zinc-800 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-200 dark:text-zinc-900"
          >
            {isResolvingProduct ? "확인 중…" : "추가"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            판매 제품
          </h3>
          <p className="mt-0.5 hidden text-xs text-zinc-600 sm:block dark:text-zinc-400">
            위에서 제품을 추가한 뒤, 수량·결제방식은 행마다 선택하거나 아래
            일괄 적용을 사용하세요.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800/40 sm:space-y-0">
          <div className="flex flex-nowrap items-center gap-1.5 sm:mr-4 sm:inline-flex sm:flex-wrap sm:items-center sm:gap-2">
            <span className={`${bulkBarLabelClass} shrink-0`}>수량 일괄</span>
            <input
              type="number"
              min={1}
              value={bulkQuantity}
              onChange={(event) =>
                setBulkQuantity(Math.max(1, Number(event.target.value) || 1))
              }
              className={`${bulkBarInputClass} w-16 shrink-0 sm:w-20`}
              aria-label="일괄 적용할 수량"
            />
            <button
              type="button"
              onClick={applyBulkQuantity}
              disabled={bulkQuantity < 1 || lines.length === 0}
              className={`${bulkBarButtonClass} shrink-0 whitespace-nowrap px-2 sm:px-3`}
            >
              전체 적용
            </button>
          </div>

          <div className="flex flex-nowrap items-center gap-1.5 sm:inline-flex sm:flex-wrap sm:items-center sm:gap-2">
            <span className={`${bulkBarLabelClass} shrink-0`}>결제 일괄</span>
            <div className="min-w-0 flex-1 sm:min-w-[10rem] sm:max-w-xs sm:flex-none">
              <PaymentMethodCombobox
                paymentMethods={livePaymentMethods}
                value={bulkPaymentMethodId}
                onChange={setBulkPaymentMethodId}
                preferNativeSelect
                className={`${bulkBarInputClass} w-full min-w-0 sm:min-w-[10rem]`}
                aria-label="일괄 적용할 결제방식"
              />
            </div>
            <button
              type="button"
              onClick={applyBulkPaymentMethod}
              disabled={!bulkPaymentMethodId || lines.length === 0}
              className={`${bulkBarButtonClass} shrink-0 whitespace-nowrap px-2 sm:px-3`}
            >
              전체 적용
            </button>
          </div>
        </div>

        <div className="space-y-3 sm:hidden">
          {lines.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
              제품을 추가해 주세요.
            </p>
          ) : null}

          {lines.map((line, index) => {
            const preview = linePreview(line, livePaymentMethods);

            return (
              <div
                key={line.id}
                className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    제품 {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    aria-label={`${index + 1}번째 제품 삭제`}
                  >
                    삭제
                  </button>
                </div>

                <div>
                  <label className={mobileFieldLabelClass}>출고지</label>
                  <select
                    value={line.fulfillmentLocation}
                    onChange={(event) =>
                      updateLine(line.id, {
                        fulfillmentLocation: event.target
                          .value as FulfillmentLocation,
                      })
                    }
                    className={mobileFieldInputClass}
                    aria-label={`${index + 1}번째 출고지`}
                  >
                    {FULFILLMENT_LOCATIONS.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={mobileFieldLabelClass}>판매제품</label>
                  {selectedProductsByLine[line.id] ? (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {selectedProductsByLine[line.id]!.model_name ||
                          selectedProductsByLine[line.id]!.sku}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {selectedProductsByLine[line.id]!.product_name}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400">-</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={mobileFieldLabelClass} htmlFor={`sale_quantity_${line.id}`}>
                      판매수량
                    </label>
                    <input
                      id={`sale_quantity_${line.id}`}
                      type="number"
                      min={1}
                      required={Boolean(line.productId)}
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.id, {
                          quantity: Number(event.target.value) || 0,
                        })
                      }
                      className={mobileFieldInputClass}
                      aria-label={`${index + 1}번째 판매수량`}
                    />
                  </div>
                  <div>
                    <label className={mobileFieldLabelClass}>판매단가</label>
                    <PriceInput
                      min={0}
                      required={Boolean(line.productId)}
                      value={line.unitSalePrice}
                      onChange={(unitSalePrice) =>
                        updateLine(line.id, { unitSalePrice })
                      }
                      className={mobileFieldInputClass}
                      aria-label={`${index + 1}번째 판매단가`}
                    />
                  </div>
                </div>

                <div>
                  <label className={mobileFieldLabelClass}>결제방식</label>
                  <PaymentMethodCombobox
                    required={Boolean(line.productId)}
                    paymentMethods={livePaymentMethods}
                    value={line.paymentMethodId}
                    onChange={(paymentMethodId) =>
                      updateLine(line.id, { paymentMethodId })
                    }
                    preferNativeSelect
                    className={mobileFieldInputClass}
                    aria-label={`${index + 1}번째 결제방식`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={mobileFieldLabelClass}>매입가</label>
                    {line.productId ? (
                      <PriceInput
                        min={0}
                        value={line.unitPurchasePrice}
                        onChange={(unitPurchasePrice) =>
                          updateLine(line.id, { unitPurchasePrice })
                        }
                        className={mobileFieldInputClass}
                        aria-label={`${index + 1}번째 매입가`}
                      />
                    ) : (
                      <p className="py-2.5 text-sm text-zinc-400">-</p>
                    )}
                  </div>
                  <div>
                    <label className={mobileFieldLabelClass}>업체배송비</label>
                    <PriceInput
                      min={0}
                      value={line.shippingCost}
                      onChange={(shippingCost) =>
                        updateLine(line.id, { shippingCost })
                      }
                      className={mobileFieldInputClass}
                      aria-label={`${index + 1}번째 업체 배송비`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/60">
                  <span className="text-zinc-600 dark:text-zinc-400">마진</span>
                  <span className={`font-semibold ${marginAmountClass(preview.marginAmount)}`}>
                    {line.productId
                      ? `${formatKRW(preview.marginAmount)}원`
                      : "-"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 sm:block dark:border-zinc-700">
          <table className="min-w-[1080px] w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <tr>
                <th className="min-w-[5rem] px-3 py-2.5 font-semibold">
                  출고지
                </th>
                <th className="min-w-[14rem] px-3 py-2.5 font-semibold">
                  판매제품
                </th>
                <th className="min-w-[5rem] px-3 py-2.5 font-semibold">
                  판매수량
                </th>
                <th className="min-w-[7rem] px-3 py-2.5 font-semibold">
                  판매단가
                </th>
                <th className="min-w-[9rem] px-3 py-2.5 font-semibold">
                  결제방식
                </th>
                <th className="min-w-[6rem] px-3 py-2.5 font-semibold">
                  매입가
                </th>
                <th className="min-w-[6rem] px-3 py-2.5 font-semibold">
                  업체배송비
                </th>
                <th className="min-w-[6rem] px-3 py-2.5 font-semibold">
                  마진
                </th>
                <th className="w-10 px-2 py-2.5" aria-label="행 삭제" />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    제품을 추가해 주세요.
                  </td>
                </tr>
              ) : null}
              {lines.map((line, index) => {
                const preview = linePreview(line, livePaymentMethods);

                return (
                  <tr
                    key={line.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2 align-top">
                      <select
                        value={line.fulfillmentLocation}
                        onChange={(event) =>
                          updateLine(line.id, {
                            fulfillmentLocation: event.target
                              .value as FulfillmentLocation,
                          })
                        }
                        className={`${tableInputClass} w-20`}
                        aria-label={`${index + 1}번째 출고지`}
                      >
                        {FULFILLMENT_LOCATIONS.map((location) => (
                          <option key={location} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {selectedProductsByLine[line.id] ? (
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {selectedProductsByLine[line.id]!.model_name ||
                              selectedProductsByLine[line.id]!.sku}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {selectedProductsByLine[line.id]!.product_name}
                          </p>
                        </div>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        id={`sale_quantity_${line.id}`}
                        type="number"
                        min={1}
                        required={Boolean(line.productId)}
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(line.id, {
                            quantity: Number(event.target.value) || 0,
                          })
                        }
                        className={tableInputClass}
                        aria-label={`${index + 1}번째 판매수량`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <PriceInput
                        min={0}
                        required={Boolean(line.productId)}
                        value={line.unitSalePrice}
                        onChange={(unitSalePrice) =>
                          updateLine(line.id, { unitSalePrice })
                        }
                        className={tableInputClass}
                        aria-label={`${index + 1}번째 판매단가`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <PaymentMethodCombobox
                        required={Boolean(line.productId)}
                        paymentMethods={livePaymentMethods}
                        value={line.paymentMethodId}
                        onChange={(paymentMethodId) =>
                          updateLine(line.id, { paymentMethodId })
                        }
                        className={tableInputClass}
                        aria-label={`${index + 1}번째 결제방식`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      {line.productId ? (
                        <PriceInput
                          min={0}
                          value={line.unitPurchasePrice}
                          onChange={(unitPurchasePrice) =>
                            updateLine(line.id, { unitPurchasePrice })
                          }
                          className={tableInputClass}
                          aria-label={`${index + 1}번째 매입가`}
                        />
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <PriceInput
                        min={0}
                        value={line.shippingCost}
                        onChange={(shippingCost) =>
                          updateLine(line.id, { shippingCost })
                        }
                        className={tableInputClass}
                        aria-label={`${index + 1}번째 업체 배송비`}
                      />
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 align-top font-semibold ${marginAmountClass(preview.marginAmount)}`}
                    >
                      {line.productId
                        ? `${formatKRW(preview.marginAmount)}원`
                        : "-"}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        aria-label={`${index + 1}번째 제품 삭제`}
                      >
                        −
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </section>

      <div>
        <label htmlFor="note" className={labelClass}>
          메모 (선택)
        </label>
        <input
          id="note"
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="예: 전시품 판매"
          className={inputClass}
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          전체 예상 금액
        </p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-zinc-600 dark:text-zinc-400">매출 합계</dt>
            <dd className="font-bold text-zinc-900 dark:text-zinc-100">
              {formatKRW(totals.totalAmount)}원
            </dd>
          </div>
          <div>
            <dt className="text-zinc-600 dark:text-zinc-400">결제 수수료</dt>
            <dd className="font-bold text-zinc-700 dark:text-zinc-300">
              -{formatKRW(totals.paymentFeeAmount)}원
            </dd>
          </div>
          <div>
            <dt className="text-zinc-600 dark:text-zinc-400">마진 (이익)</dt>
            <dd className={`font-bold ${marginAmountClass(totals.marginAmount)}`}>
              {formatKRW(totals.marginAmount)}원
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          각 행 마진 = (판매단가 − 매입가) × 수량 − 결제 수수료 − 업체 배송비
        </p>
      </div>

      {(clientError || state?.error) ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {clientError ?? state?.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !hasValidLine}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        {isSubmitting
          ? "저장 중..."
          : `판매 등록 (${lines.filter((line) => line.productId).length}건 · 재고 자동 차감)`}
      </button>
      </form>

      {productCreateQuery !== null ? (
        <InlineProductCreateModal
          context="sale"
          initialModelName={productCreateQuery}
          onClose={() => setProductCreateQuery(null)}
          onCreated={(product) =>
            handleSaleProductCreated(toSaleProductOption(product))
          }
        />
      ) : null}

      {stockApprovalItems ? (
        <SaleStockApprovalDialog
          title="마이너스 재고 승인"
          description="매장 출고 시 재고가 부족합니다. 품목별 재고를 확인한 뒤 진행해 주세요."
          items={stockApprovalItems}
          confirmLabel="승인 후 등록"
          isPending={isSubmitting}
          onConfirm={() => {
            stockApprovalBypassRef.current = true;
            setStockApprovalItems(null);
            submitSaleForm();
          }}
          onCancel={() => {
            if (!isSubmitting) setStockApprovalItems(null);
          }}
        />
      ) : null}

      {leaveDialog}
    </>
  );
}
