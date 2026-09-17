import { NextResponse } from "next/server";
import {
  COMPANY_DOCUMENT_BUCKET,
  buildDocumentContentDisposition,
  fetchCompanyDocumentById,
} from "@/lib/company-documents";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";
import { getRolePermissionMap } from "@/lib/role-permission-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string; filename?: string[] }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { user, profile } = await getCurrentUserProfile();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const role = normalizeRole(profile?.role);
  const permissionMap = await getRolePermissionMap();
  if (!hasPermission(role, "viewDocuments", permissionMap)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const supabase = await createClient();
  const document = await fetchCompanyDocumentById(supabase, id);
  if (!document) {
    return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "파일 다운로드 설정이 필요합니다." },
      { status: 500 },
    );
  }

  const { data, error } = await adminClient.storage
    .from(COMPANY_DOCUMENT_BUCKET)
    .download(document.storage_path);

  if (error || !data) {
    return NextResponse.json(
      { error: "파일을 불러오지 못했습니다." },
      { status: 404 },
    );
  }

  const downloadRequested =
    new URL(request.url).searchParams.get("download") === "1";
  const disposition = downloadRequested ? "attachment" : "inline";

  return new NextResponse(data, {
    headers: {
      "Content-Type": document.mime_type,
      "Content-Disposition": buildDocumentContentDisposition(
        document.file_name,
        disposition,
      ),
      "Cache-Control": "private, no-store",
    },
  });
}
