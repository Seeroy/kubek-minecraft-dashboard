"use client";

import type { Role } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Checkbox } from "@/shared/ui/checkbox";
import { DataReveal } from "@/shared/ui/data-reveal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import type { UserAccess } from "@shared/access/can";
import { Lock, ShieldCheck } from "lucide-react";
import { useRoleLabels } from "../../data/access-areas";
import { SAMPLE_ROLES } from "../../data/samples";
import { roleWithin } from "./useAccessContext";

const sortRoles = (roles: Role[]) => [...roles].sort((a, b) => Number(b.builtin) - Number(a.builtin));

interface RolePickerProps {
  roles: Role[] | undefined;
  loading?: boolean;
  limit: UserAccess | null;
  value: string[];
  onChange: (next: string[]) => void;
}

/** Roles as toggle chips, ones above the editor's access stay as they are */
export function RolePicker({ roles, loading, limit, value, onChange }: RolePickerProps) {
  const { t } = useTranslation("modules.settings.userForm");
  const labels = useRoleLabels();

  if (!loading && !roles?.length) return <p className="text-[12.5px] text-muted-foreground">{t("noRolesYet")}</p>;

  return (
    <DataReveal id="settings-role-picker" data={roles ?? []} loading={loading} sample={SAMPLE_ROLES}>
      {(list) => (
        <div className="flex flex-wrap gap-1.5">
          {sortRoles(list).map((role) => {
            const blocked = !roleWithin(role, limit);
            const description = labels.description(role);
            const hint = blocked ? t("roleAbove") : description;
            const chip = (
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border py-1.5 pr-2.5 pl-2 transition-colors hover:bg-hover has-disabled:cursor-not-allowed has-disabled:opacity-60 has-data-checked:border-primary/50 has-data-checked:bg-primary/6">
                <Checkbox
                  checked={value.includes(role.id)}
                  disabled={blocked}
                  onCheckedChange={(on) => onChange(on ? [...value, role.id] : value.filter((id) => id !== role.id))}
                />
                {blocked ? <Lock className="size-3.5 text-muted-foreground" /> : role.builtin && <ShieldCheck className="size-3.5 text-primary" />}
                <span className="text-[13px] font-medium">{labels.name(role)}</span>
              </label>
            );
            if (!hint) return <span key={role.id}>{chip}</span>;
            return (
              <Tooltip key={role.id}>
                <TooltipTrigger render={<span />}>{chip}</TooltipTrigger>
                <TooltipContent className="max-w-64">{hint}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </DataReveal>
  );
}
