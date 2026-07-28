"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createSale } from "@/app/sales/actions";
import ProductSearchSelect from "@/components/product-search-select";
import PhoneInput from "@/components/phone-input";
import SaleCategorySelect from "@/components/sale-category-select";
import {
  calculateSaleAmounts,
  formatKRW,
} from "@/lib/sales-calculator";
import type { PaymentMethod, SaleProductOption } from "@/types/sale";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400";

const tableInputClass =
  "w-full min-w-[4rem] rounded border border-zinc-400 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const tableSelectClass =
  "w-full min-w-[7rem] rounded border border-zinc-400 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type SaleFormProps = {
  products: SaleProductOption[];
  paymentMethods: PaymentMethod[];
};

type SaleLineDraft = {
  id: string;
  productId: string;
  quantity: number;
  unitSalePrice: number;
  unitPurchasePrice: number;
  paymentMethodId: string;
};

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyLine(paymentMethods: PaymentMethod[]): SaleLineDraft {
  return {
    id: crypto.randomUUID(),
    productId: "",
    quantity: 1,
    unitSalePrice: 0,
    unitPurchasePrice: 0,
    paymentMethodId: paymentMethods[0]?.id ?? "",
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
  });
}

export default function SaleForm({ products, paymentMethods }: SaleFormProps) {
  const [lines, setLines] = useState<SaleLineDraft[]>(() => [
    createEmptyLine(paymentMethods),
  ]);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await createSale(formData)) ?? null;
    },
    null,
  );

  const linesJson = useMemo(
    () =>
      JSON.stringify(
        lines.map((line) => ({
          product_id: line.productId,
          quantity: line.quantity,
          unit_sale_price: line.unitSalePrice,
          payment_method_id: line.paymentMethodId,
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
      const preview = linePreview(line, paymentMethods);
      totalAmount += preview.totalAmount;
      paymentFeeAmount += preview.paymentFeeAmount;
      marginAmount += preview.marginAmount;
    }

    return { totalAmount, paymentFeeAmount, marginAmount };
  }, [lines, paymentMethods]);

  const hasValidLine = lines.some((line) => line.productId);

  function updateLine(id: string, patch: Partial<SaleLineDraft>) {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function handleProductChange(lineId: string, productId: string) {
    const product = products.find((item) => item.id === productId);
    updateLine(lineId, {
      productId,
      unitSalePrice: product?.sale_price ?? 0,
      unitPurchasePrice: product?.purchase_price ?? 0,
    });
  }

  function addLine() {
    setLines((prev) => [...prev, createEmptyLine(paymentMethods)]);
  }

  function removeLine(id: string) {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((line) => line.id !== id),
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="lines_json" value={linesJson} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sale_category" className={labelClass}>
            구분 <span className="text-red-500">*</span>
          </label>
          <SaleCategorySelect />
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
            defaultValue={todayString()}
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
              + 버튼으로 여러 제품을 한 번에 등록할 수 있습니다.
            </p>
          </div>
          <Link
            href="/sales/payment-methods"
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            결제 수단 관리 →
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <tr>
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
                  마진
                </th>
                <th className="w-10 px-2 py-2.5" aria-label="행 삭제" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const preview = linePreview(line, paymentMethods);

                return (
                  <tr
                    key={line.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2 align-top">
                      <ProductSearchSelect
                        products={products}
                        selectedProductId={line.productId}
                        onSelect={(productId) =>
                          handleProductChange(line.id, productId)
                        }
                        compact
                        showHiddenField={false}
                        showHelperText={false}
                        inputId={`product_search_${line.id}`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        min={1}
                        required
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
                      <input
                        type="number"
                        min={0}
                        required
                        value={line.unitSalePrice}
                        onChange={(event) =>
                          updateLine(line.id, {
                            unitSalePrice: Number(event.target.value) || 0,
                          })
                        }
                        className={tableInputClass}
                        aria-label={`${index + 1}번째 판매단가`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <select
                        required
                        value={line.paymentMethodId}
                        onChange={(event) =>
                          updateLine(line.id, {
                            paymentMethodId: event.target.value,
                          })
                        }
                        className={tableSelectClass}
                        aria-label={`${index + 1}번째 결제방식`}
                      >
                        {paymentMethods.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.name} ({method.fee_rate}%)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-zinc-700 dark:text-zinc-300">
                      {line.productId
                        ? `${formatKRW(line.unitPurchasePrice)}원`
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top font-semibold text-green-700 dark:text-green-300">
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
            <input
              id="business_partner"
              name="business_partner"
              placeholder="예: OO음악학원"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="customer_name" className={labelClass}>
              고객명
            </label>
            <input
              id="customer_name"
              name="customer_name"
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
            <dd className="font-bold text-green-700 dark:text-green-300">
              {formatKRW(totals.marginAmount)}원
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          각 행 마진 = (판매단가 − 매입가) × 수량 − 결제 수수료
        </p>
      </div>

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !hasValidLine}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        {isPending
          ? "저장 중..."
          : `판매 등록 (${lines.filter((line) => line.productId).length}건 · 재고 자동 차감)`}
      </button>
    </form>
  );
}
