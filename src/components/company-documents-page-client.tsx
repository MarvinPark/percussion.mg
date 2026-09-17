"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  deleteCompanyDocument,
  uploadCompanyDocument,
} from "@/app/(main)/documents/actions";
import CompanyDocumentsList from "@/components/company-documents-list";
import TableRowSizeControl from "@/components/table-row-size-control";
import {
  COMPANY_DOCUMENT_PRESETS,
  isCompanyDocumentExpired,
} from "@/lib/company-documents";
import {
  companyDocumentListSortToSearchParams,
  cycleCompanyDocumentListSort,
  parseCompanyDocumentListSort,
  sortCompanyDocuments,
  type CompanyDocumentListSort,
  type CompanyDocumentSortColumn,
} from "@/lib/company-documents-sort";
import {
  DEFAULT_TABLE_ROW_FONT_SIZE,
  loadTableRowFontSize,
  saveTableRowFontSize,
} from "@/lib/table-row-preferences";
import type { CompanyDocument } from "@/types/company-document";

type CompanyDocumentsPageClientProps = {
  userId: string;
  documents: CompanyDocument[];
  canManage: boolean;
  schemaError?: string | null;
};

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

function syncDocumentsSortUrl(sort: CompanyDocumentListSort) {
  const params = new URLSearchParams(window.location.search);
  const sortParams = companyDocumentListSortToSearchParams(sort);

  if (sortParams.sort) {
    params.set("sort", sortParams.sort);
    params.set("order", sortParams.order ?? "desc");
  } else {
    params.delete("sort");
    params.delete("order");
  }

  const query = params.toString();
  window.history.replaceState(
    null,
    "",
    query ? `${window.location.pathname}?${query}` : window.location.pathname,
  );
}

export default function CompanyDocumentsPageClient({
  userId,
  documents,
  canManage,
  schemaError,
}: CompanyDocumentsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [titlePreset, setTitlePreset] = useState<string>(
    COMPANY_DOCUMENT_PRESETS[0],
  );
  const [customTitle, setCustomTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [sort, setSort] = useState<CompanyDocumentListSort>(() =>
    parseCompanyDocumentListSort(
      searchParams.get("sort"),
      searchParams.get("order"),
    ),
  );
  const [rowFontSize, setRowFontSize] = useState(DEFAULT_TABLE_ROW_FONT_SIZE);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    setRowFontSize(loadTableRowFontSize("company-documents", userId));
    setPreferencesLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    saveTableRowFontSize("company-documents", userId, rowFontSize);
  }, [preferencesLoaded, rowFontSize, userId]);

  const sortedDocuments = useMemo(
    () => sortCompanyDocuments(documents, sort),
    [documents, sort],
  );

  const expiredCount = useMemo(
    () => documents.filter((doc) => isCompanyDocumentExpired(doc.expires_at)).length,
    [documents],
  );

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function handleSortColumn(column: CompanyDocumentSortColumn) {
    const nextSort = cycleCompanyDocumentListSort(sort, column);
    setSort(nextSort);
    syncDocumentsSortUrl(nextSort);
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("title", titlePreset);
    formData.set("custom_title", customTitle);
    formData.set("expires_at", expiresAt);
    formData.set("note", note);

    const result = await uploadCompanyDocument(formData);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    form.reset();
    setTitlePreset(COMPANY_DOCUMENT_PRESETS[0]);
    setCustomTitle("");
    setExpiresAt("");
    setNote("");
    setMessage("문서를 업로드했습니다.");
    refresh();
  }

  function handleDelete(document: CompanyDocument) {
    const expired = isCompanyDocumentExpired(document.expires_at);
    const confirmed = window.confirm(
      expired
        ? `"${document.title}" 만료 문서를 삭제할까요?\n파일이 영구 삭제됩니다.`
        : `"${document.title}" 문서를 삭제할까요?\n파일이 영구 삭제됩니다.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCompanyDocument(document.id);
      if ("error" in result && result.error) {
        window.alert(result.error);
        return;
      }
      setMessage("문서를 삭제했습니다.");
      refresh();
    });
  }

  return (
    <div className="space-y-6">
      {schemaError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {schemaError}
        </p>
      ) : null}

      {canManage ? (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            문서 업로드
          </h3>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            PDF 또는 이미지 파일을 업로드합니다. (최대 15MB)
          </p>

          <form onSubmit={handleUpload} className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <label htmlFor="document_title_preset" className={labelClass}>
                문서 종류
              </label>
              <select
                id="document_title_preset"
                value={titlePreset}
                onChange={(event) => setTitlePreset(event.target.value)}
                className={inputClass}
              >
                {COMPANY_DOCUMENT_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
                <option value="__custom__">직접 입력</option>
              </select>
            </div>

            {titlePreset === "__custom__" ? (
              <div>
                <label htmlFor="document_custom_title" className={labelClass}>
                  문서명
                </label>
                <input
                  id="document_custom_title"
                  value={customTitle}
                  onChange={(event) => setCustomTitle(event.target.value)}
                  placeholder="예: 법인인감증명서"
                  className={inputClass}
                  required
                />
              </div>
            ) : (
              <div>
                <label htmlFor="document_expires_at" className={labelClass}>
                  만료일 (선택)
                </label>
                <input
                  id="document_expires_at"
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            {titlePreset === "__custom__" ? (
              <div>
                <label htmlFor="document_expires_at_custom" className={labelClass}>
                  만료일 (선택)
                </label>
                <input
                  id="document_expires_at_custom"
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className={inputClass}
                />
              </div>
            ) : null}

            <div className={titlePreset === "__custom__" ? "" : "lg:col-span-2"}>
              <label htmlFor="document_note" className={labelClass}>
                메모 (선택)
              </label>
              <input
                id="document_note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="예: 2026년 갱신본"
                className={inputClass}
              />
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="document_file" className={labelClass}>
                파일
              </label>
              <input
                id="document_file"
                name="file"
                type="file"
                required
                accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 dark:text-zinc-300"
              />
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={isPending || Boolean(schemaError)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500"
              >
                {isPending ? "업로드 중..." : "업로드"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {message ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {expiredCount > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          만료된 문서 {expiredCount}건이 있습니다. 새 파일을 업로드한 뒤 기존
          문서를 삭제해 주세요.
        </p>
      ) : null}

      <div className="hidden items-center justify-end md:flex">
        <TableRowSizeControl value={rowFontSize} onChange={setRowFontSize} />
      </div>

      <CompanyDocumentsList
        userId={userId}
        documents={sortedDocuments}
        canManage={canManage}
        isPending={isPending}
        sort={sort}
        rowFontSize={rowFontSize}
        onSortColumn={handleSortColumn}
        onDelete={handleDelete}
      />

      {isPending ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">처리 중...</p>
      ) : null}
    </div>
  );
}
