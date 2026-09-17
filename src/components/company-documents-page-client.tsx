"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  deleteCompanyDocument,
  uploadCompanyDocument,
} from "@/app/(main)/documents/actions";
import {
  COMPANY_DOCUMENT_PRESETS,
  formatCompanyDocumentExpiry,
  formatCompanyDocumentFileSize,
  isCompanyDocumentExpired,
} from "@/lib/company-documents";
import type { CompanyDocument } from "@/types/company-document";

type CompanyDocumentsPageClientProps = {
  documents: CompanyDocument[];
  canManage: boolean;
  schemaError?: string | null;
};

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

const deleteButtonClass =
  "rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60";

const clickableRowClass =
  "cursor-pointer transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-800/50 dark:active:bg-zinc-800";

function formatCreatedAt(value: string) {
  return value.slice(0, 10);
}

function getDocumentViewUrl(documentId: string) {
  return `/api/documents/${documentId}/download`;
}

function openDocument(document: CompanyDocument) {
  window.location.assign(getDocumentViewUrl(document.id));
}

type DocumentRowProps = {
  document: CompanyDocument;
  canManage: boolean;
  isPending: boolean;
  onDelete: (document: CompanyDocument) => void;
};

function DocumentDeleteButton({
  document,
  canManage,
  isPending,
  onDelete,
}: DocumentRowProps) {
  if (!canManage) return null;

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(event) => {
        event.stopPropagation();
        onDelete(document);
      }}
      className={deleteButtonClass}
    >
      삭제
    </button>
  );
}

function DocumentMobileCard({
  document,
  canManage,
  isPending,
  onDelete,
}: DocumentRowProps) {
  const expired = isCompanyDocumentExpired(document.expires_at);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => openDocument(document)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDocument(document);
        }
      }}
      className={
        expired
          ? `rounded-xl border border-zinc-200 bg-zinc-100/90 p-3 dark:border-zinc-700 dark:bg-zinc-800/60 ${clickableRowClass}`
          : `rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900 ${clickableRowClass}`
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={
              expired
                ? "font-semibold text-zinc-600 dark:text-zinc-400"
                : "font-semibold text-zinc-900 dark:text-zinc-100"
            }
          >
            {document.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">
            {document.file_name} ·{" "}
            {formatCompanyDocumentFileSize(document.file_size)}
          </p>
        </div>
        <DocumentDeleteButton
          document={document}
          canManage={canManage}
          isPending={isPending}
          onDelete={onDelete}
        />
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">만료일</dt>
          <dd
            className={
              expired
                ? "font-semibold text-red-600 dark:text-red-400"
                : "text-zinc-800 dark:text-zinc-200"
            }
          >
            {expired
              ? `만료 (${formatCompanyDocumentExpiry(document.expires_at)})`
              : formatCompanyDocumentExpiry(document.expires_at)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">등록일</dt>
          <dd className="text-zinc-800 dark:text-zinc-200">
            {formatCreatedAt(document.created_at)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">등록자</dt>
          <dd className="truncate text-zinc-800 dark:text-zinc-200">
            {document.created_by_name ?? "-"}
          </dd>
        </div>
      </dl>

      {document.note ? (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {document.note}
        </p>
      ) : null}
    </article>
  );
}

export default function CompanyDocumentsPageClient({
  documents,
  canManage,
  schemaError,
}: CompanyDocumentsPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [titlePreset, setTitlePreset] = useState<string>(
    COMPANY_DOCUMENT_PRESETS[0],
  );
  const [customTitle, setCustomTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");

  const expiredCount = useMemo(
    () => documents.filter((doc) => isCompanyDocumentExpired(doc.expires_at)).length,
    [documents],
  );

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
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

      <div className="space-y-3 md:hidden">
        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            등록된 문서가 없습니다.
          </div>
        ) : (
          documents.map((document) => (
            <DocumentMobileCard
              key={document.id}
              document={document}
              canManage={canManage}
              isPending={isPending}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 md:block dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">문서 종류</th>
              <th className="px-4 py-3 text-left font-semibold">파일</th>
              <th className="px-4 py-3 text-left font-semibold">만료일</th>
              <th className="px-4 py-3 text-left font-semibold">등록일</th>
              <th className="px-4 py-3 text-left font-semibold">등록자</th>
              {canManage ? (
                <th className="px-4 py-3 text-left font-semibold">삭제</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 6 : 5}
                  className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  등록된 문서가 없습니다.
                </td>
              </tr>
            ) : (
              documents.map((document) => {
                const expired = isCompanyDocumentExpired(document.expires_at);
                return (
                  <tr
                    key={document.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDocument(document)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDocument(document);
                      }
                    }}
                    className={
                      expired
                        ? `border-b border-zinc-100 bg-zinc-100/90 text-zinc-500 last:border-0 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400 ${clickableRowClass}`
                        : `border-b border-zinc-100 last:border-0 dark:border-zinc-800 ${clickableRowClass}`
                    }
                  >
                    <td className="px-4 py-3 font-medium">
                      <div>{document.title}</div>
                      {document.note ? (
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {document.note}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="truncate">{document.file_name}</div>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatCompanyDocumentFileSize(document.file_size)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {expired ? (
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          만료 ({formatCompanyDocumentExpiry(document.expires_at)})
                        </span>
                      ) : (
                        formatCompanyDocumentExpiry(document.expires_at)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {formatCreatedAt(document.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {document.created_by_name ?? "-"}
                    </td>
                    {canManage ? (
                      <td
                        className="px-4 py-3"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DocumentDeleteButton
                          document={document}
                          canManage={canManage}
                          isPending={isPending}
                          onDelete={handleDelete}
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isPending ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">처리 중...</p>
      ) : null}
    </div>
  );
}
