"use client";

import { btnPrimary, sectionAccent, sectionMuted } from "@/lib/ui-classes";
import { useActionState, useMemo, useRef, useState } from "react";
import { createQuote, findQuoteProductForAdd, updateQuote } from "@/app/(main)/quotes/actions";
import ModelNameAutocomplete, {
  type ModelNameAutocompleteHandle,
} from "@/components/model-name-autocomplete";
import ConfirmDialog from "@/components/confirm-dialog";
import InlineProductCreateModal from "@/components/inline-product-create-modal";
import { toQuoteProductOption } from "@/lib/inline-product-create-shared";
import QuoteItemsTable from "@/components/quote-items-table";
import PaymentMethodCombobox from "@/components/payment-method-combobox";
import PhoneInput from "@/components/phone-input";
import PriceInput from "@/components/price-input";
import SaleCategorySelect from "@/components/sale-category-select";
import SaleCustomerAutocomplete from "@/components/sale-customer-autocomplete";
import BusinessPartnerAutocomplete from "@/components/business-partner-autocomplete";
import { getPartnerCustomerFields } from "@/lib/business-partners";
import {
  calculateQuoteLine,
  calculateQuoteTotals,
  calculateQuoteFinalMargin,
} from "@/lib/quote-calculator";
import {
  DEFAULT_FULFILLMENT_LOCATION,
  type FulfillmentLocation,
} from "@/lib/quote-fulfillment";
import type { SaleContactSuggestions } from "@/lib/sale-contact-suggestions";
import { displaySaleCategoryFromList } from "@/lib/sale-category-options";
import { formatKRW } from "@/lib/sales-calculator";
import { useLivePaymentMethods } from "@/hooks/use-live-payment-methods";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { getDefaultPaymentMethodId } from "@/lib/payment-methods";
import { isQuoteFormDirty } from "@/lib/unsaved-form-dirty";
import type { PaymentMethod } from "@/types/sale";
import type {
  QuoteItemInput,
  QuoteProductOption,
} from "@/types/quote";
import { QUOTE_MAX_ITEMS } from "@/types/quote";

const inputClass =
  "w-full rounded border border-zinc-400 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const mobileInputClass =
  "w-full rounded border border-zinc-400 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none focus:border-blue-500 sm:px-2 sm:py-1.5 sm:text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass = "text-xs font-semibold text-zinc-700 dark:text-zinc-300";

type QuoteEditInitial = {
  quote_date: string;
  sale_category: string;
  customer_name: string;
  business_partner: string;
  partner_id: string;
  customer_phone: string;
  customer_address: string;
  customer_email: string;
  customer_note: string;
  memo: string;
  manager_name: string;
  payment_method_id: string;
  items: QuoteItemInput[];
  is_reserved?: boolean;
};

type QuoteFormProps = {
  userId: string;
  paymentMethods: PaymentMethod[];
  saleCategories: string[];
  managerName: string;
  managerPhone: string;
  contactSuggestions: SaleContactSuggestions;
  quoteId?: string;
  initialQuote?: QuoteEditInitial;
  onSaved?: () => void;
};

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function buildItemFromProduct(
  product: QuoteProductOption,
  quantity: number,
  saleUnitPrice: number,
  purchasePrice?: number,
): QuoteItemInput {
  const resolvedPurchasePrice = purchasePrice ?? product.purchase_price;
  const calculated = calculateQuoteLine({
    quantity,
    consumerPrice: product.sale_price,
    saleUnitPrice,
    purchasePrice: resolvedPurchasePrice,
    shippingCost: 0,
  });

  return {
    product_id: product.id,
    fulfillment_location: DEFAULT_FULFILLMENT_LOCATION,
    supplier: product.supplier,
    purchase_source: product.supplier,
    category: product.category ?? "",
    brand: product.brand ?? "",
    product_name: product.product_name,
    model_name: product.model_name || product.sku,
    color: product.color,
    product_option: product.product_option,
    size: product.size,
    quantity,
    consumer_price: product.sale_price,
    sale_unit_price: saleUnitPrice,
    rounded_unit_price: calculated.roundedUnitPrice,
    line_total: calculated.lineTotal,
    purchase_price: resolvedPurchasePrice,
    shipping_cost: 0,
    margin: calculated.margin,
    margin_rate: calculated.marginRate,
  };
}

function recalculateItem(item: QuoteItemInput): QuoteItemInput {
  const calculated = calculateQuoteLine({
    quantity: item.quantity,
    consumerPrice: item.consumer_price,
    saleUnitPrice: item.sale_unit_price,
    purchasePrice: item.purchase_price,
    shippingCost: item.shipping_cost,
  });

  return {
    ...item,
    rounded_unit_price: calculated.roundedUnitPrice,
    line_total: calculated.lineTotal,
    margin: calculated.margin,
    margin_rate: calculated.marginRate,
  };
}

export default function QuoteForm({
  userId,
  paymentMethods,
  saleCategories,
  managerName,
  managerPhone,
  contactSuggestions,
  quoteId,
  initialQuote,
  onSaved,
}: QuoteFormProps) {
  const isEditing = Boolean(quoteId);
  const livePaymentMethods = useLivePaymentMethods(paymentMethods);

  const [items, setItems] = useState<QuoteItemInput[]>(
    initialQuote?.items ?? [],
  );
  const [modelSearch, setModelSearch] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<QuoteProductOption | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [addSalePrice, setAddSalePrice] = useState(0);
  const [addPurchasePrice, setAddPurchasePrice] = useState(0);
  const [isResolvingProduct, setIsResolvingProduct] = useState(false);
  const [productCreateQuery, setProductCreateQuery] = useState<string | null>(
    null,
  );
  const [quoteDate, setQuoteDate] = useState(
    initialQuote?.quote_date ?? todayString(),
  );
  const [saleCategory, setSaleCategory] = useState(() =>
    displaySaleCategoryFromList(initialQuote?.sale_category, saleCategories),
  );
  const [editableManagerName, setEditableManagerName] = useState(
    initialQuote?.manager_name ?? managerName,
  );
  const [customerName, setCustomerName] = useState(
    initialQuote?.customer_name ?? "",
  );
  const [businessPartner, setBusinessPartner] = useState(
    initialQuote?.business_partner ?? "",
  );
  const [partnerId, setPartnerId] = useState(initialQuote?.partner_id ?? "");
  const [customerPhone, setCustomerPhone] = useState(
    initialQuote?.customer_phone ?? "",
  );
  const [customerAddress, setCustomerAddress] = useState(
    initialQuote?.customer_address ?? "",
  );
  const [customerEmail, setCustomerEmail] = useState(
    initialQuote?.customer_email ?? "",
  );
  const [customerNote, setCustomerNote] = useState(
    initialQuote?.customer_note ?? "",
  );
  const [memo, setMemo] = useState(initialQuote?.memo ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(
    () =>
      initialQuote?.payment_method_id ??
      getDefaultPaymentMethodId(paymentMethods),
  );
  const modelInputRef = useRef<ModelNameAutocompleteHandle>(null);
  const submitFormRef = useRef<HTMLFormElement>(null);
  const skipReserveConfirmRef = useRef(false);
  const [reserveEditConfirmOpen, setReserveEditConfirmOpen] = useState(false);

  const initialSnapshot = useMemo(() => {
    if (!initialQuote) return null;

    return JSON.stringify({
      items: initialQuote.items,
      quoteDate: initialQuote.quote_date,
      saleCategory: displaySaleCategoryFromList(
        initialQuote.sale_category,
        saleCategories,
      ),
      editableManagerName: initialQuote.manager_name,
      customerName: initialQuote.customer_name ?? "",
      businessPartner: initialQuote.business_partner ?? "",
      partnerId: initialQuote.partner_id ?? "",
      customerPhone: initialQuote.customer_phone ?? "",
      customerAddress: initialQuote.customer_address ?? "",
      customerEmail: initialQuote.customer_email ?? "",
      customerNote: initialQuote.customer_note ?? "",
      memo: initialQuote.memo ?? "",
      paymentMethodId:
        initialQuote.payment_method_id ??
        getDefaultPaymentMethodId(paymentMethods),
    });
  }, [initialQuote, paymentMethods, saleCategories]);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      if (isEditing) {
        const result = await updateQuote(formData);
        if (result?.success) {
          onSaved?.();
        }
        return result ?? null;
      }
      return (await createQuote(formData)) ?? null;
    },
    null,
  );

  const totals = useMemo(() => calculateQuoteTotals(items), [items]);

  const isDirty = useMemo(
    () =>
      isQuoteFormDirty({
        items,
        quoteDate,
        saleCategory,
        editableManagerName,
        customerName,
        businessPartner,
        partnerId,
        customerPhone,
        customerAddress,
        customerEmail,
        customerNote,
        memo,
        paymentMethodId,
        initialSnapshot,
      }),
    [
      items,
      quoteDate,
      saleCategory,
      editableManagerName,
      customerName,
      businessPartner,
      partnerId,
      customerPhone,
      customerAddress,
      customerEmail,
      customerNote,
      memo,
      paymentMethodId,
      initialSnapshot,
    ],
  );

  const { dialog: leaveDialog } = useUnsavedChangesGuard(isDirty && !isPending);

  const selectedPaymentMethod = useMemo(
    () => livePaymentMethods.find((method) => method.id === paymentMethodId),
    [livePaymentMethods, paymentMethodId],
  );

  const paymentFeeMargin = useMemo(() => {
    if (!selectedPaymentMethod) return null;
    return calculateQuoteFinalMargin(
      totals.totalAmount,
      totals.totalMargin,
      selectedPaymentMethod.fee_rate,
    );
  }, [totals.totalAmount, totals.totalMargin, selectedPaymentMethod]);

  function handleProductPick(product: QuoteProductOption) {
    setSelectedProduct(product);
    setAddSalePrice(product.sale_price);
    setAddPurchasePrice(product.purchase_price);
  }

  function handleRegisterProductFromSearch(query: string) {
    setProductCreateQuery(query);
  }

  function handleQuoteProductCreated(product: QuoteProductOption) {
    setModelSearch(product.model_name || product.sku);
    handleProductPick(product);
    setProductCreateQuery(null);
    focusModelInput();
  }

  async function resolveProductForAdd(): Promise<QuoteProductOption | null> {
    if (selectedProduct) return selectedProduct;

    const query = modelSearch.trim();
    if (!query) return null;

    const { product } = await findQuoteProductForAdd(query);
    return product;
  }

  async function addItem(): Promise<boolean> {
    if (isResolvingProduct) return false;

    setIsResolvingProduct(true);
    let product: QuoteProductOption | null = null;
    try {
      product = await resolveProductForAdd();
    } finally {
      setIsResolvingProduct(false);
    }

    if (!product || addQuantity <= 0) {
      alert("모델명을 입력하고 목록에서 제품을 선택해 주세요.");
      return false;
    }

    if (items.length >= QUOTE_MAX_ITEMS) {
      const existingIndex = items.findIndex(
        (item) => item.product_id === product.id,
      );
      if (existingIndex < 0) {
        alert(`제품은 최대 ${QUOTE_MAX_ITEMS}개까지 추가할 수 있습니다.`);
        return false;
      }
    }

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product_id === product.id,
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = buildItemFromProduct(
          product,
          prev[existingIndex].quantity + addQuantity,
          addSalePrice,
          addPurchasePrice,
        );
        return next;
      }
      return [
        ...prev,
        buildItemFromProduct(product, addQuantity, addSalePrice, addPurchasePrice),
      ];
    });

    setModelSearch("");
    setSelectedProduct(null);
    setAddQuantity(1);
    setAddSalePrice(0);
    setAddPurchasePrice(0);
    focusModelInput();
    return true;
  }

  function focusModelInput() {
    requestAnimationFrame(() => {
      modelInputRef.current?.focus();
    });
  }

  function updateItemSalePrice(index: number, saleUnitPrice: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? recalculateItem({ ...item, sale_unit_price: saleUnitPrice })
          : item,
      ),
    );
  }

  function updateItemQuantity(index: number, quantity: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? recalculateItem({ ...item, quantity }) : item,
      ),
    );
  }

  function updateItemPurchaseSource(index: number, purchaseSource: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, purchase_source: purchaseSource } : item,
      ),
    );
  }

  function updateItemPurchasePrice(index: number, purchasePrice: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? recalculateItem({ ...item, purchase_price: purchasePrice })
          : item,
      ),
    );
  }

  function updateItemFulfillmentLocation(
    index: number,
    fulfillmentLocation: FulfillmentLocation,
  ) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, fulfillment_location: fulfillmentLocation }
          : item,
      ),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const [draggingItemIndex, setDraggingItemIndex] = useState<number | null>(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);

  function reorderItems(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;

    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function handleItemDragStart(index: number) {
    setDraggingItemIndex(index);
  }

  function handleItemDragEnd() {
    setDraggingItemIndex(null);
    setDragOverItemIndex(null);
  }

  function handleItemDragOver(event: React.DragEvent, index: number) {
    event.preventDefault();
    if (draggingItemIndex !== null && draggingItemIndex !== index) {
      setDragOverItemIndex(index);
    }
  }

  function handleItemDrop(index: number) {
    if (draggingItemIndex !== null && draggingItemIndex !== index) {
      reorderItems(draggingItemIndex, index);
    }
    handleItemDragEnd();
  }

  return (
    <div className="space-y-6">
      <section className={sectionMuted}>
        <h3 className="text-center text-2xl font-bold tracking-[0.3em] text-zinc-900 dark:text-zinc-100">
          견 적 서
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>담당</label>
            <input
              value={editableManagerName}
              onChange={(event) => setEditableManagerName(event.target.value)}
              placeholder="예: 홍길동 실장"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>견적일</label>
            <input
              type="date"
              value={quoteDate}
              onChange={(event) => setQuoteDate(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="quote_sale_category" className={labelClass}>
              구분 *
            </label>
            <SaleCategorySelect
              id="quote_sale_category"
              categories={saleCategories}
              value={saleCategory}
              onChange={(value) =>
                setSaleCategory(displaySaleCategoryFromList(value, saleCategories))
              }
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <p className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          고객 정보
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="quote_business_partner" className={labelClass}>
                거래처명
              </label>
              <BusinessPartnerAutocomplete
                id="quote_business_partner"
                name="business_partner"
                value={businessPartner}
                partnerId={partnerId}
                onChange={setBusinessPartner}
                onPartnerIdChange={setPartnerId}
                onSelectPartner={(partner) => {
                  const fields = getPartnerCustomerFields(partner);
                  if (fields.customerName) setCustomerName(fields.customerName);
                  if (fields.customerPhone) setCustomerPhone(fields.customerPhone);
                  if (fields.customerAddress) {
                    setCustomerAddress(fields.customerAddress);
                  }
                }}
                placeholder="입력"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="quote_customer_name" className={labelClass}>
                고객명 *
              </label>
              <SaleCustomerAutocomplete
                id="quote_customer_name"
                name="customer_name"
                value={customerName}
                onChange={setCustomerName}
                suggestions={contactSuggestions.customers}
                onSelectCustomer={(customer) => {
                  setCustomerPhone(customer.phone);
                  setCustomerAddress(customer.address);
                }}
                placeholder="입력"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
            <div>
              <label htmlFor="quote_customer_phone" className={labelClass}>
                연락처
              </label>
              <PhoneInput
                id="quote_customer_phone"
                name="customer_phone"
                value={customerPhone}
                onChange={setCustomerPhone}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="quote_customer_address" className={labelClass}>
                주소
              </label>
              <input
                id="quote_customer_address"
                value={customerAddress}
                onChange={(event) => setCustomerAddress(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
            <div>
              <label className={labelClass}>이메일</label>
              <input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>비고</label>
              <input
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={sectionAccent}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              견적금액 (VAT포함)
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatKRW(totals.totalAmount)}원
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              총 마진
            </p>
            <p className="mt-1 text-xl font-bold text-green-700 dark:text-green-300">
              {formatKRW(totals.totalMargin)}원
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              카드결제 +4%
            </p>
            <p className="mt-1 text-xl font-bold text-orange-700 dark:text-orange-300">
              {formatKRW(totals.cardAmount)}원
            </p>
            {paymentFeeMargin && selectedPaymentMethod ? (
              <div className="mt-3 border-t border-orange-200 pt-3 dark:border-orange-800">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  최종마진 ({selectedPaymentMethod.name}{" "}
                  {selectedPaymentMethod.fee_rate}% 수수료 반영)
                </p>
                <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                  {formatKRW(paymentFeeMargin.finalMargin)}원
                </p>
              </div>
            ) : null}
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
                  const label = (prev.model_name || prev.sku).trim();
                  return value.trim() === label ? prev : null;
                });
              }}
              onSelectProduct={handleProductPick}
              onRegisterProduct={handleRegisterProductFromSearch}
            />
          </div>
          <div className="w-12 shrink-0 sm:w-20">
            <label className={labelClass}>수량</label>
            <input
              type="number"
              min={1}
              value={addQuantity}
              onChange={(e) => setAddQuantity(Number(e.target.value) || 1)}
              className={`${mobileInputClass} text-center tabular-nums`}
            />
          </div>
          <div className="w-36 sm:w-32">
            <label className={labelClass}>판매가</label>
            <PriceInput
              min={0}
              value={addSalePrice}
              onChange={setAddSalePrice}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addItem();
                }
              }}
              className={mobileInputClass}
            />
          </div>
          <div className="w-28 shrink-0 sm:w-32">
            <label className={labelClass}>매입가</label>
            <PriceInput
              min={0}
              value={addPurchasePrice}
              onChange={setAddPurchasePrice}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addItem();
                }
              }}
              className={mobileInputClass}
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

      <QuoteItemsTable
        userId={userId}
        items={items}
        mobileInputClass={mobileInputClass}
        draggingItemIndex={draggingItemIndex}
        dragOverItemIndex={dragOverItemIndex}
        onItemDragStart={handleItemDragStart}
        onItemDragEnd={handleItemDragEnd}
        onItemDragOver={handleItemDragOver}
        onItemDrop={handleItemDrop}
        onFulfillmentChange={updateItemFulfillmentLocation}
        onPurchaseSourceChange={updateItemPurchaseSource}
        onQuantityChange={updateItemQuantity}
        onSalePriceChange={updateItemSalePrice}
        onPurchasePriceChange={updateItemPurchasePrice}
        onRemoveItem={removeItem}
      />

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <p className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">
          결제 방식
        </p>
        {livePaymentMethods.length === 0 ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            등록된 결제 방식이 없습니다. 관리자 페이지에서 먼저 등록해 주세요.
          </p>
        ) : (
          <PaymentMethodCombobox
            id="quote_payment_method"
            paymentMethods={livePaymentMethods}
            value={paymentMethodId}
            onChange={setPaymentMethodId}
            className={inputClass}
            placeholder="결제 방식 입력 또는 선택"
            required
          />
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <label className={labelClass}>메모</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          placeholder="견적 관련 메모를 입력하세요"
          className={`${inputClass} mt-1 resize-y`}
        />
      </section>

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}
      {state && "success" in state && state.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          견적이 수정되었습니다.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <form
          ref={submitFormRef}
          action={formAction}
          className="inline"
          onSubmit={(event) => {
            if (
              isEditing &&
              initialQuote?.is_reserved &&
              isDirty &&
              !skipReserveConfirmRef.current
            ) {
              event.preventDefault();
              setReserveEditConfirmOpen(true);
            }
          }}
        >
          {isEditing ? (
            <input type="hidden" name="quote_id" value={quoteId} />
          ) : null}
          <input type="hidden" name="quote_date" value={quoteDate} />
          <input type="hidden" name="sale_category" value={saleCategory} />
          <input type="hidden" name="manager_name" value={editableManagerName} />
          <input type="hidden" name="payment_method_id" value={paymentMethodId} />
          <input type="hidden" name="customer_name" value={customerName} />
          <input type="hidden" name="business_partner" value={businessPartner} />
          <input type="hidden" name="partner_id" value={partnerId} />
          <input type="hidden" name="customer_phone" value={customerPhone} />
          <input
            type="hidden"
            name="customer_address"
            value={customerAddress}
          />
          <input type="hidden" name="customer_email" value={customerEmail} />
          <input type="hidden" name="customer_note" value={customerNote} />
          <input type="hidden" name="memo" value={memo} />
          <input type="hidden" name="items_json" value={JSON.stringify(items)} />
          <button
            type="submit"
            disabled={
              isPending || items.length === 0 || livePaymentMethods.length === 0
            }
            className={`${btnPrimary} px-4 py-2.5`}
          >
            {isPending
              ? "저장 중..."
              : isEditing
                ? "견적 수정"
                : "견적 저장"}
          </button>
        </form>
      </div>

      {productCreateQuery !== null ? (
        <InlineProductCreateModal
          context="quote"
          initialModelName={productCreateQuery}
          onClose={() => setProductCreateQuery(null)}
          onCreated={(product) =>
            handleQuoteProductCreated(toQuoteProductOption(product))
          }
        />
      ) : null}

      {reserveEditConfirmOpen ? (
        <ConfirmDialog
          title="예약 수량을 변경하시겠습니까?"
          description="견적 품목·수량이 바뀌면 예약 재고도 함께 조정됩니다. (재고 부족 시 마이너스 허용)"
          confirmLabel="변경 후 저장"
          onConfirm={() => {
            setReserveEditConfirmOpen(false);
            skipReserveConfirmRef.current = true;
            submitFormRef.current?.requestSubmit();
            window.setTimeout(() => {
              skipReserveConfirmRef.current = false;
            }, 0);
          }}
          onCancel={() => setReserveEditConfirmOpen(false)}
        />
      ) : null}

      {leaveDialog}
    </div>
  );
}
