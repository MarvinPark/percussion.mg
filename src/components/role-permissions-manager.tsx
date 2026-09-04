"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { updateRolePermissions } from "@/app/(main)/settings/users/actions";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  cloneRolePermissionMap,
  type Permission,
  type RolePermissionMap,
} from "@/lib/permissions";
import type { UserRole } from "@/types/profile";

const roleOrder: UserRole[] = ["admin", "manager", "employee"];

type RolePermissionsManagerProps = {
  initialMap: RolePermissionMap;
  needsMigration?: boolean;
};

const checkboxClass =
  "h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600";

export default function RolePermissionsManager({
  initialMap,
  needsMigration = false,
}: RolePermissionsManagerProps) {
  const router = useRouter();
  const [map, setMap] = useState<RolePermissionMap>(() =>
    cloneRolePermissionMap(initialMap),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMap(cloneRolePermissionMap(initialMap));
  }, [initialMap]);

  const isDirty = useMemo(
    () =>
      JSON.stringify(map) !== JSON.stringify(initialMap),
    [initialMap, map],
  );

  function togglePermission(role: UserRole, permission: Permission, checked: boolean) {
    setMap((current) => {
      const next = cloneRolePermissionMap(current);
      const permissions = new Set(next[role]);

      if (checked) {
        permissions.add(permission);
      } else {
        permissions.delete(permission);
      }

      if (role === "admin") {
        permissions.add("manageUsers");
      }

      next[role] = Array.from(permissions);
      return next;
    });
  }

  function handleReset() {
    setMap(cloneRolePermissionMap(initialMap));
    setError(null);
  }

  function handleSave() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await updateRolePermissions(map);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      setMessage("역할 권한을 저장했습니다.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {needsMigration ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          역할 권한 테이블이 없어 기본값만 표시됩니다. Supabase SQL Editor에서{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            supabase/schema-role-permissions.sql
          </code>
          을 실행한 뒤 저장해 주세요.
        </p>
      ) : null}

      <div className="min-w-0 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
        <table className="w-full min-w-[20rem] text-sm">
          <thead className="bg-zinc-100 text-left text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            <tr>
              <th className="px-3 py-2 font-semibold">권한</th>
              {roleOrder.map((role) => (
                <th key={role} className="px-3 py-2 text-center font-semibold">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <Fragment key={group.label}>
                <tr
                  className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/40"
                >
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400"
                  >
                    {group.label}
                  </td>
                </tr>
                {group.permissions.map((permission) => (
                  <tr
                    key={permission}
                    className="border-t border-zinc-200 dark:border-zinc-700"
                  >
                    <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      {PERMISSION_LABELS[permission]}
                    </td>
                    {roleOrder.map((role) => {
                      const checked = map[role].includes(permission);
                      const locked =
                        role === "admin" && permission === "manageUsers";

                      return (
                        <td key={`${role}-${permission}`} className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isPending || locked}
                            onChange={(event) =>
                              togglePermission(role, permission, event.target.checked)
                            }
                            className={checkboxClass}
                            aria-label={`${ROLE_LABELS[role]} ${PERMISSION_LABELS[permission]}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        관리자 역할의 &quot;사용자·권한 관리&quot;는 실수로 잠그지 않도록 항상
        켜져 있습니다.
      </p>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          {isPending ? "저장 중..." : "권한 저장"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending || !isDirty}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          되돌리기
        </button>
      </div>
    </div>
  );
}
