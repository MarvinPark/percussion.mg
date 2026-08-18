"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchAuthProfile } from "@/lib/profile-auth";
import {
  canUseApp,
  needsAdminApproval,
  needsProfileSetup,
} from "@/types/profile";

async function redirectAfterAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await fetchAuthProfile(supabase, user.id);

  if (needsAdminApproval(profile)) {
    redirect("/profile/pending-approval");
  }

  if (needsProfileSetup(profile)) {
    redirect("/profile/setup");
  }

  if (!canUseApp(profile)) {
    redirect("/profile/pending-approval");
  }

  redirect("/dashboard");
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  revalidatePath("/", "layout");
  await redirectAfterAuth(supabase);
}

export async function registerUser(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (!email) return { error: "이메일을 입력해 주세요." };
  if (!full_name) return { error: "이름을 입력해 주세요." };
  if (!phone) return { error: "전화번호를 입력해 주세요." };
  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }
  if (password !== passwordConfirm) {
    return { error: "비밀번호 확인이 일치하지 않습니다." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "이미 등록된 이메일입니다. 로그인해 주세요." };
    }
    return { error: "회원가입에 실패했습니다. 입력 정보를 확인해 주세요." };
  }

  if (!data.user) {
    return { error: "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const profilePayload = {
    id: data.user.id,
    full_name,
    phone,
    job_title: "",
    role: "employee" as const,
    account_status: "pending_approval" as const,
    email,
    updated_at: new Date().toISOString(),
  };

  let profileError = null;

  if (data.session) {
    const { error } = await supabase.from("profiles").upsert(profilePayload);
    profileError = error;
    await supabase.auth.signOut();
  } else {
    try {
      const adminClient = createAdminClient();
      const { error } = await adminClient.from("profiles").upsert(profilePayload);
      profileError = error;
    } catch {
      profileError = { message: "profile insert failed" };
    }
  }

  if (profileError) {
    return {
      error:
        "프로필 저장에 실패했습니다. supabase/schema-admin-settings.sql을 실행했는지 확인해 주세요.",
    };
  }

  revalidatePath("/", "layout");

  if (!data.session) {
    return {
      success:
        "가입 확인 메일을 발송했습니다. 메일 인증 후 관리자 승인을 기다려 주세요. 인증 후 사용 가능합니다.",
    };
  }

  return {
    success:
      "등록이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다. 인증 후 사용 가능합니다.",
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
