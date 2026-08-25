"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { checkCreateSaleStock, createSale } from "@/app/(main)/sales/actions";
import ProductSearchSelect from "@/components/product-search-select";
import InlineProductCreateModal from "@/components/inline-product-create-modal";
import SaleStockPurchaseDialog from "@/components/sale-stock-purchase-dialog";
import { toSaleProductOption } from "@/lib/inline-product-create-shared";
import PhoneInput from "@/components/phone-input";
import PaymentMethodCombobox from "@/components/payment-method-combobox";
import PriceInput from "@/components/price-input";
import SaleCategorySelect from "@/components/sale-category-select";
import SaleCustomerAutocomplete from "@/components/sale-customer-autocomplete";
import SaleTextAutocomplete from "@/components/sale-text-autocomplete";
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
  buildPurchaseQuantitiesArray,
  getInsufficientStockLines,
  mapStockCheckItemsToLines,
  type SaleStockPurchaseItem,
} from "@/lib/sale-stock-shortage";
import { isSaleFormDirty } from "@/lib/unsaved-form-dirty";
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
  "h-[34px] rounded border border-zinc-400 bg-white px-2 text-xs text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const bulkBarButtonClass =
  "inline-flex h-[34px] shrink-0 items-center rounded border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type SaleFormProps = {
  paymentMethods: PaymentMethod[];
  contactSuggestions: SaleContactSuggestions;
  saleCategories: string[];
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

function createEmptyLine(
  paymentMethods: PaymentMethod[],
  options?: { paymentMethodId?: string; quantity?: number },
): SaleLineDraft {
  return {
    id: crypto.randomUUID(),
    productId: "",
    quantity: options?.quantity ?? 1,
    unitSalePrice: 0,
    unitPurchasePrice: 0,
    paymentMethodId:
      options?.paymentMethodId ??
      getDefaultPaymentMethodId(paymentMethods),
    fulfillmentLocation: DEFAULT_FULFILLMENT_LOCATION,
    shippingCost: 0,
  };
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
}: SaleFormProps) {
  const livePaymentMethods = useLivePaymentMethods(paymentMethods);
  const [lines, setLines] = useState<SaleLineDraft[]>(() => [
    createEmptyLine(paymentMethods),
  ]);
  const [selectedProductsByLine, setSelectedProductsByLine] = useState<
    Record<string, SaleProductOption>
  >({});
  const [productCreateModal, setProductCreateModal] = useState<{
    lineId: string;
    initialQuery: string;
  } | null>(null);
  const [bulkPaymentMethodId, setBulkPaymentMethodId] = useState(
    () => getDefaultPaymentMethodId(paymentMethods),
  );
  const [bulkQuantity, setBulkQuantity] = useState(1);
  const [businessPartner, setBusinessPartner] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [soldAt, setSoldAt] = useState(() => todayString());
  const [saleCategory, setSaleCategory] = useState(
    () => saleCategories[0] ?? "",
  );
  const [note, setNote] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [purchaseQuantitiesJson, setPurchaseQuantitiesJson] = useState("[]");
  const [stockPurchaseItems, setStockPurchaseItems] = useState<
    SaleStockPurchaseItem[] | null
  >(null);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const skipStockPurchasePromptRef = useRef(false);
  const isOpeningStockDialogRef = useRef(false);
  const handledStockErrorRef = useRef<string | null>(null);
  const lastSaleErrorRef = useRef<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
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

  const { dialog: leaveDialog } = useUnsavedChangesGuard(
    isDirty && !(isPending || isCheckingStock),
  );

  function submitSaleForm(purchaseQuantitiesJsonValue = "[]") {
    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    formData.set("purchase_quantities_json", purchaseQuantitiesJsonValue);
    setPurchaseQuantitiesJson(purchaseQuantitiesJsonValue);
    formAction(formData);
  }

  async function resolveInsufficientStockItems() {
    const clientItems = getInsufficientStockLines(lines, selectedProductsByLine);
    if (clientItems.length > 0) {
      return clientItems;
    }

    const result = await checkCreateSaleStock(linesJson);
    if (result.error) {
      throw new Error(result.error);
    }

    if (!result.insufficientItems?.length) {
      return [];
    }

    return mapStockCheckItemsToLines(result.insufficientItems, lines);
  }

  useEffect(() => {
    lastSaleErrorRef.current = state?.error ?? null;
  }, [state?.error]);

  useEffect(() => {
    const message = state?.error;
    if (!message?.includes("재고가 부족")) {
      handledStockErrorRef.current = null;
      return;
    }
    if (
      stockPurchaseItems ||
      isOpeningStockDialogRef.current ||
      handledStockErrorRef.current === message
    ) {
      return;
    }

    isOpeningStockDialogRef.current = true;
    handledStockErrorRef.current = message;
    void resolveInsufficientStockItems()
      .then((items) => {
        if (items.length > 0) {
          setClientError(null);
          setStockPurchaseItems(items);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          setClientError(error.message);
        }
      })
      .finally(() => {
        isOpeningStockDialogRef.current = false;
      });
  }, [state?.error, stockPurchaseItems, lines, linesJson, selectedProductsByLine]);

  function updateLine(id: string, patch: Partial<SaleLineDraft>) {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function openProductCreate(lineId: string, initialQuery: string) {
    if (!lineId) return;
    setProductCreateModal({ lineId, initialQuery });
  }

  function handleHeaderRegisterProduct() {
    const emptyLine = lines.find((line) => !line.productId);
    if (emptyLine) {
      openProductCreate(emptyLine.id, "");
      return;
    }

    const newLine = createEmptyLine(livePaymentMethods, {
      paymentMethodId: bulkPaymentMethodId,
      quantity: bulkQuantity,
    });
    setLines((prev) => [...prev, newLine]);
    openProductCreate(newLine.id, "");
  }

  function handleSaleProductCreated(product: SaleProductOption) {
    if (!productCreateModal) return;
    handleProductChange(productCreateModal.lineId, product);
    setProductCreateModal(null);
  }

  function handleProductChange(
    lineId: string,
    product: SaleProductOption | null,
  ) {
    if (!product) {
      setSelectedProductsByLine((prev) => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
      updateLine(lineId, {
        productId: "",
        unitSalePrice: 0,
        unitPurchasePrice: 0,
      });
      return;
    }

    setSelectedProductsByLine((prev) => ({ ...prev, [lineId]: product }));
    updateLine(lineId, {
      productId: product.id,
      unitSalePrice: product.sale_price ?? 0,
      unitPurchasePrice: product.purchase_price ?? 0,
    });
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      createEmptyLine(livePaymentMethods, {
        paymentMethodId: bulkPaymentMethodId,
        quantity: bulkQuantity,
      }),
    ]);
  }

  function removeLine(id: string) {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((line) => line.id !== id),
    );
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

  function handleStockPurchaseConfirm(
    purchaseQuantities: Record<string, number>,
  ) {
    if (!stockPurchaseItems) return;

    for (const item of stockPurchaseItems) {
      const purchase = Math.max(0, Math.round(purchaseQuantities[item.id] ?? 0));
      const needed = Math.max(0, item.quantity - item.current_stock);
      if (purchase < needed) {
        setClientError(
          `${item.model_name}: 재고 부족분 ${needed}개 이상 매입 수량을 입력해 주세요.`,
        );
        return;
      }
    }

    setClientError(null);
    setPurchaseQuantitiesJson(
      JSON.stringify(buildPurchaseQuantitiesArray(lines, purchaseQuantities)),
    );
    setStockPurchaseItems(null);
    skipStockPurchasePromptRef.current = true;
    submitSaleForm(
      JSON.stringify(buildPurchaseQuantitiesArray(lines, purchaseQuantities)),
    );
  }

  const isSubmitting = isPending || isCheckingStock;

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={(event) => {
          event.preventDefault();

          void (async () => {
            const validationError = validateSaleLines(lines);
            if (validationError) {
              setClientError(validationError);
              return;
            }

            if (!skipStockPurchasePromptRef.current) {
              setIsCheckingStock(true);
              try {
                const insufficientItems = await resolveInsufficientStockItems();

                if (insufficientItems.length > 0) {
                  setClientError(null);
                  setStockPurchaseItems(insufficientItems);
                  return;
                }
              } catch (error) {
                setClientError(
                  error instanceof Error
                    ? error.message
                    : "재고 확인에 실패했습니다.",
                );
                return;
              } finally {
                setIsCheckingStock(false);
              }

              submitSaleForm("[]");
              return;
            }

            skipStockPurchasePromptRef.current = false;
            setClientError(null);
            submitSaleForm(purchaseQuantitiesJson);
          })();
        }}
        className="space-y-5"
      >
      <input type="hidden" name="lines_json" value={linesJson} />
      <input
        type="hidden"
        name="purchase_quantities_json"
        value={purchaseQuantitiesJson}
      />

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

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              판매 제품
            </h3>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              + 버튼으로 여러 제품을 한 번에 등록할 수 있습니다. 수량·결제방식은
              행마다 선택하거나 아래 일괄 적용을 사용하세요.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800/40">
          <div className="flex flex-wrap items-center gap-2">
            <span className={bulkBarLabelClass}>수량 일괄</span>
            <input
              type="number"
              min={1}
              value={bulkQuantity}
              onChange={(event) =>
                setBulkQuantity(Math.max(1, Number(event.target.value) || 1))
              }
              className={`${bulkBarInputClass} w-20`}
              aria-label="일괄 적용할 수량"
            />
            <button
              type="button"
              onClick={applyBulkQuantity}
              disabled={bulkQuantity < 1 || lines.length === 0}
              className={bulkBarButtonClass}
            >
              전체 적용
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={bulkBarLabelClass}>결제방식 일괄</span>
            <div className="min-w-[10rem] max-w-xs">
              <PaymentMethodCombobox
                paymentMethods={livePaymentMethods}
                value={bulkPaymentMethodId}
                onChange={setBulkPaymentMethodId}
                className={`${bulkBarInputClass} w-full min-w-[10rem]`}
                aria-label="일괄 적용할 결제방식"
              />
            </div>
            <button
              type="button"
              onClick={applyBulkPaymentMethod}
              disabled={!bulkPaymentMethodId || lines.length === 0}
              className={bulkBarButtonClass}
            >
              전체 적용
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-[1080px] w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <tr>
                <th className="min-w-[5rem] px-3 py-2.5 font-semibold">
                  출고지
                </th>
                <th className="min-w-[14rem] px-3 py-2.5 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    판매제품
                    <button
                      type="button"
                      onClick={handleHeaderRegisterProduct}
                      className="rounded border border-blue-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-950"
                    >
                      제품등록
                    </button>
                  </span>
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
                      <ProductSearchSelect
                        selectedProduct={selectedProductsByLine[line.id] ?? null}
                        onSelect={(product) =>
                          handleProductChange(line.id, product)
                        }
                        onRegisterProduct={(query) =>
                          openProductCreate(line.id, query)
                        }
                        compact
                        emphasizeModelName
                        showHiddenField={false}
                        showHelperText={false}
                        inputId={`product_search_${line.id}`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
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
                        disabled={lines.length <= 1}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
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

        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-400 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          + 제품 추가
        </button>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/30">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          고객 / 거래처 정보
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="business_partner" className={labelClass}>
              거래처명
            </label>
            <SaleTextAutocomplete
              id="business_partner"
              name="business_partner"
              value={businessPartner}
              onChange={setBusinessPartner}
              suggestions={contactSuggestions.businessPartners}
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
              placeholder="010-1234-5678"
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
            <dd className="font-bold text-orange-700 dark:text-orange-300">
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

      {(clientError || (state?.error && !stockPurchaseItems)) ? (
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
          ? isCheckingStock
            ? "재고 확인 중..."
            : "저장 중..."
          : `판매 등록 (${lines.filter((line) => line.productId).length}건 · 재고 자동 차감)`}
      </button>
      </form>

      {productCreateModal ? (
        <InlineProductCreateModal
          context="sale"
          initialModelName={productCreateModal.initialQuery}
          onClose={() => setProductCreateModal(null)}
          onCreated={(product) =>
            handleSaleProductCreated(toSaleProductOption(product))
          }
        />
      ) : null}

      {stockPurchaseItems ? (
        <SaleStockPurchaseDialog
          items={stockPurchaseItems}
          isPending={isSubmitting}
          onConfirm={handleStockPurchaseConfirm}
          onCancel={() => {
            setStockPurchaseItems(null);
            handledStockErrorRef.current = lastSaleErrorRef.current;
          }}
        />
      ) : null}

      {leaveDialog}
    </>
  );
}
