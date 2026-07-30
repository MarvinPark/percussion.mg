"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completeProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const full_name = String(formData.get("full_name") ?? "").trim();
  const job_title = String(formData.get("job_title") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!full_name) {
    return { error: "이름을 입력해 주세요." };
  }

  if (!job_title) {
    return { error: "직함을 입력해 주세요." };
  }

  if (!phone) {
    return { error: "전화번호를 입력해 주세요." };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name,
    job_title,
    phone,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return {
      error:
        "프로필 저장에 실패했습니다. schema-phase4.sql을 실행했는지 확인해 주세요.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
