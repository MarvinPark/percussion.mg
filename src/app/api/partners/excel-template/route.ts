import { createPartnerImportTemplateBuffer } from "@/lib/excel-business-partners";
import { getCurrentUserProfile } from "@/lib/profile";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import { getRolePermissionMap } from "@/lib/role-permission-settings";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = normalizeRole(profile?.role);
  const permissionMap = await getRolePermissionMap();
  const canManage = hasPermission(role, "managePartners", permissionMap);

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = createPartnerImportTemplateBuffer();
  const filename = "거래처목록_일괄등록양식.xlsx";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
