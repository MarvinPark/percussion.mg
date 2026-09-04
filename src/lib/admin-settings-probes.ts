import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function isMissingRoleChangeRpc(message: string) {
  return (
    message.includes("update_user_role") ||
    message.includes("Could not find the function") ||
    message.includes("42883")
  );
}

async function probeRoleChangeRpcAvailable() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_user_role", {
    target_user_id: "00000000-0000-0000-0000-000000000001",
    new_role: "employee",
  });

  if (!error) return true;
  return !isMissingRoleChangeRpc(error.message);
}

export const getRoleChangeRpcAvailable = unstable_cache(
  probeRoleChangeRpcAvailable,
  ["role-change-rpc-available"],
  { revalidate: 3600, tags: ["admin-settings"] },
);
