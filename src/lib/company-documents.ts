import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COMPANY_DOCUMENT_SELECT,
  type CompanyDocument,
} from "@/types/company-document";

export const COMPANY_DOCUMENT_PRESETS = [
  "사업자등록증",
  "통장사본",
  "4대보험완납증명서",
  "인감증명서",
  "통신판매업신고증",
] as const;

export const COMPANY_DOCUMENT_BUCKET = "company-documents";

export const COMPANY_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;

export const COMPANY_DOCUMENT_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const DOCUMENT_EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function resolveDocumentMimeType(
  fileName: string,
  reportedType?: string | null,
) {
  const normalized = reportedType?.trim().toLowerCase() ?? "";
  if (normalized === "image/jpg") {
    return "image/jpeg";
  }
  if (
    normalized &&
    normalized !== "application/octet-stream" &&
    COMPANY_DOCUMENT_ALLOWED_MIME_TYPES.has(normalized)
  ) {
    return normalized;
  }

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return DOCUMENT_EXTENSION_MIME[extension] ?? normalized;
}

export function isAllowedDocumentMimeType(mimeType: string) {
  return COMPANY_DOCUMENT_ALLOWED_MIME_TYPES.has(mimeType);
}

export function mapCompanyDocumentUploadError(message: string | undefined) {
  const detail = message?.trim() ?? "";
  const lower = detail.toLowerCase();

  if (
    lower.includes("bucket not found") ||
    lower.includes("not found") && lower.includes("bucket")
  ) {
    return "문서 저장소(bucket)가 없습니다. Supabase SQL Editor에서 supabase/schema-company-documents.sql을 실행해 주세요.";
  }

  if (
    lower.includes("mime") ||
    lower.includes("content type") ||
    lower.includes("invalid file type")
  ) {
    return "파일 형식이 허용되지 않습니다. PDF 또는 이미지(PNG, JPG, WEBP, GIF) 파일인지 확인해 주세요.";
  }

  if (lower.includes("payload too large") || lower.includes("file size")) {
    return "파일 크기는 15MB 이하여야 합니다.";
  }

  if (detail) {
    return `파일 업로드에 실패했습니다. (${detail})`;
  }

  return "파일 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

export function isMissingCompanyDocumentsTable(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("company_documents") ||
    message.includes("42P01") ||
    message.includes("does not exist")
  );
}

export function isCompanyDocumentExpired(
  expiresAt: string | null | undefined,
  today = new Date(),
) {
  if (!expiresAt) return false;
  const expiry = new Date(`${expiresAt}T23:59:59`);
  return expiry.getTime() < today.getTime();
}

export function formatCompanyDocumentExpiry(expiresAt: string | null) {
  if (!expiresAt) return "-";
  return expiresAt;
}

export function formatCompanyDocumentFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function fetchCompanyDocuments(
  supabase: SupabaseClient,
): Promise<{ documents: CompanyDocument[]; error: string | null }> {
  const { data, error } = await supabase
    .from("company_documents")
    .select(COMPANY_DOCUMENT_SELECT)
    .order("title", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingCompanyDocumentsTable(error.message)) {
      return {
        documents: [],
        error:
          "문서 테이블이 없습니다. Supabase SQL Editor에서 supabase/schema-company-documents.sql을 실행해 주세요.",
      };
    }
    return { documents: [], error: "문서 목록을 불러오지 못했습니다." };
  }

  return { documents: (data as CompanyDocument[]) ?? [], error: null };
}

export async function fetchCompanyDocumentById(
  supabase: SupabaseClient,
  id: string,
) {
  const { data, error } = await supabase
    .from("company_documents")
    .select(COMPANY_DOCUMENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as CompanyDocument;
}

export function sanitizeDocumentFileName(fileName: string) {
  const trimmed = fileName
    .trim()
    .replace(/[/\\]/g, "_")
    .replace(/[^\w.\-가-힣]/g, "_");
  return trimmed.slice(0, 180) || "document";
}

export function buildDocumentDownloadPath(
  documentId: string,
  fileName: string,
) {
  return `/api/documents/${documentId}/download/${encodeURIComponent(fileName)}`;
}

export function buildDocumentContentDisposition(
  fileName: string,
  disposition: "inline" | "attachment" = "inline",
) {
  const trimmed = fileName.trim() || "document";
  const asciiFallback =
    trimmed
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/\\/g, "_")
      .replace(/"/g, "_") || "document";
  const encoded = encodeURIComponent(trimmed);
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
