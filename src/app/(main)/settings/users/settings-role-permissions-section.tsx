import RolePermissionsManager from "@/components/role-permissions-manager";
import {
  DEFAULT_ROLE_PERMISSIONS,
  cloneRolePermissionMap,
} from "@/lib/permissions";
import { fetchRolePermissionMap } from "@/lib/role-permission-settings";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsRolePermissionsSection() {
  const supabase = await createClient();
  const rolePermissionMap = await fetchRolePermissionMap(supabase).catch(() =>
    cloneRolePermissionMap(DEFAULT_ROLE_PERMISSIONS),
  );
  const { error: migrationError } = await supabase
    .from("role_permission_grants")
    .select("role", { count: "exact", head: true });

  return (
    <RolePermissionsManager
      initialMap={rolePermissionMap}
      needsMigration={Boolean(migrationError)}
    />
  );
}
