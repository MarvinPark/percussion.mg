"use server";

import { revalidatePath } from "next/cache";
import {
  COMPANY_DOCUMENT_BUCKET,
  COMPANY_DOCUMENT_MAX_BYTES,
  fetchCompanyDocumentById,
  isAllowedDocumentMimeType,
  mapCompanyDocumentUploadError,
  resolveDocumentMimeType,
  sanitizeDocumentFileName,
} from "@/lib/company-documents";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePermission } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function revalidateDocumentsPath() {
  revalidatePath("/documents");
}

function readOptionalDate(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { error: "만료일 형식이 올바르지 않습니다." as const };
  }
  return trimmed;
}

async function ensureCompanyDocumentsBucket(adminClient: SupabaseClient) {
  const { data } = await adminClient.storage.getBucket(COMPANY_DOCUMENT_BUCKET);
  if (data) return null;

  const { error: createError } = await adminClient.storage.createBucket(
    COMPANY_DOCUMENT_BUCKET,
    {
      public: false,
      fileSizeLimit: COMPANY_DOCUMENT_MAX_BYTES,
    },
  );

  if (createError) {
    return mapCompanyDocumentUploadError(createError.message);
  }

  return null;
}

function validateUploadFile(file: File) {
  if (!file || file.size <= 0) {
    return { error: "업로드할 파일을 선택해 주세요." as const };
  }
  if (file.size > COMPANY_DOCUMENT_MAX_BYTES) {
    return { error: "파일 크기는 15MB 이하여야 합니다." as const };
  }

  const mimeType = resolveDocumentMimeType(file.name, file.type);
  if (!isAllowedDocumentMimeType(mimeType)) {
    return {
      error:
        "PDF 또는 이미지 파일(PNG, JPG, WEBP, GIF)만 업로드할 수 있습니다." as const,
    };
  }

  return { mimeType };
}

export async function uploadCompanyDocument(formData: FormData) {
  const auth = await requirePermission("manageDocuments");
  if ("error" in auth) return { error: auth.error };

  const title = String(formData.get("title") ?? "").trim();
  const customTitle = String(formData.get("custom_title") ?? "").trim();
  const resolvedTitle = title === "__custom__" ? customTitle : title;
  const note = String(formData.get("note") ?? "").trim();
  const expiresAtResult = readOptionalDate(formData.get("expires_at"));
  if (typeof expiresAtResult === "object" && expiresAtResult?.error) {
    return { error: expiresAtResult.error };
  }

  if (!resolvedTitle) {
    return { error: "문서 종류를 입력해 주세요." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "업로드할 파일을 선택해 주세요." };
  }

  const fileValidation = validateUploadFile(file);
  if ("error" in fileValidation) {
    return { error: fileValidation.error };
  }
  const { mimeType } = fileValidation;

  const documentId = crypto.randomUUID();
  const storagePath = `${documentId}/${sanitizeDocumentFileName(file.name)}`;

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "파일 업로드 설정이 필요합니다.",
    };
  }

  const bucketError = await ensureCompanyDocumentsBucket(adminClient);
  if (bucketError) return { error: bucketError };

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await adminClient.storage
    .from(COMPANY_DOCUMENT_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { error: mapCompanyDocumentUploadError(uploadError.message) };
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("company_documents").insert({
    id: documentId,
    title: resolvedTitle,
    file_name: file.name,
    storage_path: storagePath,
    mime_type: mimeType,
    file_size: file.size,
    expires_at: expiresAtResult,
    note: note || null,
    created_by_user_id: auth.userId,
    created_by_name: auth.name,
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    await adminClient.storage.from(COMPANY_DOCUMENT_BUCKET).remove([storagePath]);
    if (insertError.message.includes("company_documents")) {
      return {
        error:
          "문서 테이블이 없습니다. Supabase SQL Editor에서 supabase/schema-company-documents.sql을 실행해 주세요.",
      };
    }
    return { error: "문서 정보 저장에 실패했습니다." };
  }

  revalidateDocumentsPath();
  return { success: true as const };
}

export async function deleteCompanyDocument(documentId: string) {
  const auth = await requirePermission("manageDocuments");
  if ("error" in auth) return { error: auth.error };

  const trimmedId = documentId.trim();
  if (!trimmedId) return { error: "삭제할 문서를 찾을 수 없습니다." };

  const supabase = await createClient();
  const document = await fetchCompanyDocumentById(supabase, trimmedId);
  if (!document) return { error: "문서를 찾을 수 없습니다." };

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "파일 삭제 설정이 필요합니다.",
    };
  }

  const { error: storageError } = await adminClient.storage
    .from(COMPANY_DOCUMENT_BUCKET)
    .remove([document.storage_path]);

  if (storageError) {
    return { error: "파일 삭제에 실패했습니다." };
  }

  const { error: deleteError } = await supabase
    .from("company_documents")
    .delete()
    .eq("id", trimmedId);

  if (deleteError) {
    return { error: "문서 삭제에 실패했습니다." };
  }

  revalidateDocumentsPath();
  return { success: true as const };
}
