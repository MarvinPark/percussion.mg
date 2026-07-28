import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentUserProfile(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile };
}

export async function getModifierInfo(supabase: SupabaseClient) {
  const { user, profile } = await getCurrentUserProfile(supabase);

  if (!user) {
    return { error: "로그인이 필요합니다." as const };
  }

  if (!profile?.full_name) {
    return { error: "이름과 전화번호를 등록한 후 이용할 수 있습니다." as const };
  }

  return {
    userId: user.id,
    name: profile.full_name,
  };
}
