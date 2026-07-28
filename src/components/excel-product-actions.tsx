"use client";

import { useActionState, useRef } from "react";
import {
  importProductsFromExcel,
  type ExcelImportResult,
} from "@/app/products/excel-actions";
import {
  updateProductsFromExcel,
  type ExcelUpdateResult,
} from "@/app/products/excel-update-actions";

const buttonClass =
  "inline-flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-[12px] leading-none font-normal text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800";

function ExcelIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3 w-3 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="14" height="14" rx="1.5" fill="#217346" />
      <path d="M4.5 4.5h7v7h-7v-7z" fill="white" fillOpacity="0.15" />
      <path
        d="M5 8.2 6.4 10 8.8 6.5 10.2 8.2 12 5.5"
        stroke="white"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="4.2"
        y="6.2"
        fill="white"
        fontSize="3.2"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
      >
        X
      </text>
    </svg>
  );
}

function ResultMessage({
  state,
  successLabel,
}: {
  state: ExcelImportResult | ExcelUpdateResult | null;
  successLabel: string;
}) {
  if (!state) return null;

  if (state.error) {
    return (
      <p className="max-w-md rounded bg-red-50 px-2 py-1 text-right text-[10px] text-red-700 dark:bg-red-950 dark:text-red-300">
        {state.error}
        {state.errors?.length ? (
          <span className="mt-1 block text-left">
            {state.errors.slice(0, 5).map((message) => (
              <span key={message} className="block">
                {message}
              </span>
            ))}
            {state.errors.length > 5 ? `외 ${state.errors.length - 5}건` : null}
          </span>
        ) : null}
      </p>
    );
  }

  if (state.successCount) {
    return (
      <p className="max-w-md rounded bg-green-50 px-2 py-1 text-right text-[10px] text-green-700 dark:bg-green-950 dark:text-green-300">
        {successLabel.replace("{count}", String(state.successCount))}
        {"usedAi" in state && state.usedAi ? (
          <span className="mt-1 block text-left text-blue-700 dark:text-blue-300">
            AI가 수입사 엑셀 형식을 분석해 매칭했습니다.
          </span>
        ) : null}
        {state.errors?.length ? (
          <span className="mt-1 block text-left text-amber-700 dark:text-amber-300">
            일부 행은 처리되지 않았습니다.
            {state.errors.slice(0, 5).map((message) => (
              <span key={message} className="block">
                {message}
              </span>
            ))}
          </span>
        ) : null}
      </p>
    );
  }

  return null;
}

export default function ExcelProductActions() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const updateInputRef = useRef<HTMLInputElement>(null);

  const [importState, importAction, importPending] = useActionState<
    ExcelImportResult | null,
    FormData
  >(importProductsFromExcel, null);

  const [updateState, updateAction, updatePending] = useActionState<
    ExcelUpdateResult | null,
    FormData
  >(updateProductsFromExcel, null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1">
        <a href="/api/products/excel-template" className={buttonClass}>
          <ExcelIcon />
          엑셀양식 다운로드
        </a>

        <form action={importAction} className="inline-flex">
          <input
            ref={importInputRef}
            type="file"
            name="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.[0]) {
                event.target.form?.requestSubmit();
              }
            }}
          />
          <button
            type="button"
            disabled={importPending}
            onClick={() => importInputRef.current?.click()}
            className={buttonClass}
          >
            <ExcelIcon />
            {importPending ? "등록 중..." : "엑셀 등록"}
          </button>
        </form>

        <form action={updateAction} className="inline-flex">
          <input
            ref={updateInputRef}
            type="file"
            name="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.[0]) {
                event.target.form?.requestSubmit();
              }
            }}
          />
          <button
            type="button"
            disabled={updatePending}
            onClick={() => updateInputRef.current?.click()}
            className={buttonClass}
          >
            <ExcelIcon />
            {updatePending ? "수정 중..." : "엑셀 수정"}
          </button>
        </form>
      </div>

      <ResultMessage
        state={importState}
        successLabel="{count}개 제품이 등록되었습니다."
      />
      <ResultMessage
        state={updateState}
        successLabel="{count}개 제품이 수정되었습니다."
      />
    </div>
  );
}
