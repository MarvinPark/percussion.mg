"use server";

import {
  formatPartnerImportRowLabel,
  parsePartnerExcelBuffer,
} from "@/lib/excel-business-partners";
import { requirePermission } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PartnerExcelImportResult = {
  successCount?: number;
  updatedCount?: number;
  skippedCount?: number;
  errors?: string[];
  error?: string;
};

function isExcelFile(file: File) {
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];

  return (
    allowedTypes.includes(file.type) ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls")
  );
}

export async function importPartnersFromExcel(
  _prev: PartnerExcelImportResult | null,
  formData: FormData,
): Promise<PartnerExcelImportResult> {
  const file = formData.get("file");

  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: "엑셀 파일을 선택해 주세요." };
  }

  if (!isExcelFile(file)) {
    return { error: "xlsx 또는 xls 파일만 업로드할 수 있습니다." };
  }

  const buffer = await file.arrayBuffer();
  const { partners, errors, error: parseError } = parsePartnerExcelBuffer(buffer);

  if (parseError) {
    return { error: parseError, errors };
  }

  const auth = await requirePermission("managePartners");
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();
  let successCount = 0;
  let updatedCount = 0;
  const importErrors = [...errors];

  for (const partner of partners) {
    const rowLabel = formatPartnerImportRowLabel(partner.rowNumbers);

    const { data: existing } = await supabase
      .from("business_partners")
      .select("id")
      .eq("corp_num", partner.corp_num)
      .maybeSingle();

    const payload = {
      partner_type: partner.partner_type,
      display_name: partner.display_name,
      contact_name: partner.contact_name,
      contact_phone: partner.contact_phone,
      contact_email: partner.contact_email,
      contact_address: partner.contact_address,
      corp_num: partner.corp_num,
      corp_name: partner.corp_name,
      ceo_name: partner.ceo_name,
      biz_type: partner.biz_type,
      biz_class: partner.biz_class,
      invoice_address: partner.invoice_address,
      invoice_email: partner.invoice_email,
      invoice_tax_reg_id: partner.invoice_tax_reg_id,
      invoice_contact_name: partner.invoice_contact_name,
      invoice_contact_dept: partner.invoice_contact_dept,
      invoice_contact_tel: partner.invoice_contact_tel,
      invoice_contact_hp: partner.invoice_contact_hp,
      invoice_contact_name2: partner.invoice_contact_name2,
      invoice_contact_dept2: partner.invoice_contact_dept2,
      invoice_contact_tel2: partner.invoice_contact_tel2,
      invoice_contact_hp2: partner.invoice_contact_hp2,
      invoice_contact_email2: partner.invoice_contact_email2,
      invoice_ready: partner.invoice_ready,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("business_partners")
        .update(payload)
        .eq("id", existing.id);

      if (updateError) {
        importErrors.push(`${rowLabel}: 기존 거래처 수정에 실패했습니다.`);
        continue;
      }

      updatedCount += 1;
      continue;
    }

    const { error: insertError } = await supabase.from("business_partners").insert({
      ...payload,
      source: "manual",
    });

    if (insertError) {
      if (insertError.code === "23505") {
        importErrors.push(`${rowLabel}: 이미 등록된 사업자등록번호입니다.`);
      } else {
        importErrors.push(`${rowLabel}: 등록에 실패했습니다.`);
      }
      continue;
    }

    successCount += 1;
  }

  revalidatePath("/partners");

  if (successCount === 0 && updatedCount === 0 && importErrors.length > 0) {
    return {
      error: "거래처를 등록하지 못했습니다.",
      errors: importErrors,
    };
  }

  return {
    successCount,
    updatedCount,
    errors: importErrors.length > 0 ? importErrors : undefined,
  };
}
