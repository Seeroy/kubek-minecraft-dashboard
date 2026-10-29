"use client";

import type { Role } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { accessWithin } from "@shared/access/areas";
import type { UserAccess } from "@shared/access/can";
import { useMemo } from "react";
import { useExtPermissions } from "../../api/roles.queries";
import { toAccessMap, useRoleLabels } from "../../data/access-areas";
import type { ExtOption, InheritedRole } from "./AccessMatrix";

/** Extension permissions as matrix rows, labels may be translation keys */
export function useExtOptions(enabled = true): ExtOption[] {
  const { t } = useTranslation();
  const { data } = useExtPermissions(enabled);
  return useMemo(
    () =>
      (data ?? []).map(({ key, label }) => {
        const translated = t(label);
        return { key, label: translated.startsWith("NOT TRANSLATED") ? label : translated };
      }),
    [data, t]
  );
}

/** Access of the current user as an edit limit, null for admins */
export function useAccessLimit(): UserAccess | null {
  const user = useAuthStore((s) => s.user);
  return user?.isAdmin ? null : (user?.access ?? { levels: {}, ext: [] });
}

/** A role fits when none of its levels or keys is above the limit */
export function roleWithin(role: Pick<Role, "grants" | "ext">, limit: UserAccess | null): boolean {
  if (!limit) return true;
  return accessWithin(toAccessMap(role.grants), limit.levels) && role.ext.every((key) => limit.ext.includes(key));
}

export function useInheritedRoles(roles: Role[] | undefined, ids: string[]): InheritedRole[] {
  const { name } = useRoleLabels();
  return useMemo(
    () => (roles ?? []).filter((role) => ids.includes(role.id)).map((role) => ({ name: name(role), grants: toAccessMap(role.grants), ext: role.ext })),
    [roles, ids, name]
  );
}
