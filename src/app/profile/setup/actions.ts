"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeAccountStatus } from "@/types/profile";

export async function completeProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("account_status, job_title, phone")
    .eq("id", user.id)
    .maybeSingle();

  const accountStatus = normalizeAccountStatus(existingProfile?.account_status);
  const full_name = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (accountStatus === "pending_setup") {
    if (!full_name) {
      return { error: "이름을 입력해 주세요." };
    }

    if (password.length < 8) {
      return { error: "비밀번호는 8자 이상이어야 합니다." };
    }

    if (password !== passwordConfirm) {
      return { error: "비밀번호 확인이 일치하지 않습니다." };
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      return { error: "비밀번호 설정에 실패했습니다. 다시 시도해 주세요." };
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name,
      job_title: existingProfile?.job_title ?? "",
      phone: existingProfile?.phone?.trim() || "미등록",
      account_status: "pending_approval",
      email: user.email ?? null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { error: "프로필 저장에 실패했습니다." };
    }

    revalidatePath("/", "layout");
    redirect("/profile/pending-approval");
  }

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
    account_status: "active",
    email: user.email ?? null,
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
