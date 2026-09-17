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
  const trimmed = fileName.trim().replace(/[/\\]/g, "_");
  return trimmed.slice(0, 180) || "document";
}
