"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateProfile(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
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

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      job_title,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: "프로필 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/my-page");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function verifyCurrentPassword(
  currentPassword: string,
): Promise<{ error?: string }> {
  const password = currentPassword.trim();
  if (!password) {
    return { error: "현재 비밀번호를 입력해 주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "로그인이 필요합니다." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (error) {
    return { error: "현재 비밀번호가 올바르지 않습니다." };
  }

  return {};
}

export async function changePassword(formData: FormData): Promise<{ error?: string }> {
  const currentPassword = String(formData.get("current_password") ?? "").trim();
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword) {
    return { error: "현재 비밀번호를 입력해 주세요." };
  }

  if (newPassword.length < 6) {
    return { error: "새 비밀번호는 6자 이상이어야 합니다." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "새 비밀번호 확인이 일치하지 않습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "로그인이 필요합니다." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: "현재 비밀번호가 올바르지 않습니다." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: "비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/my-page");
  return {};
}
