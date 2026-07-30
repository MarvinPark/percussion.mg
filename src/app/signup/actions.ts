"use server";

import { getAppUrl } from "@/lib/app-url";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback`,
      data: {
        full_name,
        job_title,
        phone,
      },
    },
  });

  if (error) {
    return { error: "회원가입에 실패했습니다. 이메일 형식을 확인해 주세요." };
  }

  if (!data.user) {
    return { error: "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  if (!data.session) {
    return {
      message:
        "가입 확인 메일을 발송했습니다. 메일의 링크를 클릭한 뒤 로그인해 주세요.",
    };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    full_name,
    job_title,
    phone,
  });

  if (profileError) {
    return {
      error:
        "프로필 저장에 실패했습니다. Supabase에서 schema-phase4.sql을 실행했는지 확인해 주세요.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
