import { runPopbillConnectionTest } from "@/lib/popbill/test-connection";
import { getCurrentUserProfile, requirePermission } from "@/lib/profile";
import { NextResponse } from "next/server";

export async function GET() {
  const { user } = await getCurrentUserProfile();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const auth = await requirePermission("manageUsers");
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error ?? "관리자만 연결 테스트를 실행할 수 있습니다." },
      { status: 403 },
    );
  }

  const result = await runPopbillConnectionTest();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
