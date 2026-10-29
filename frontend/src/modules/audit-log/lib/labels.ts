import type { AuditLogEntry } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ACCESS_LEVELS, type AccessLevel, isAccessArea } from "@shared/access/areas";

const known = (label: string) => !!label && !label.startsWith("NOT TRANSLATED");

// FTP toggles are panel settings edits recorded under their own type
const FIELD_SCOPES: Record<string, string> = { ftp: "config" };

const humanize = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

/** Name of a changed field, null when only the raw path can be shown */
export function useFieldLabel(resourceType: string | null | undefined) {
  const { t } = useTranslation("modules.auditLog.fields");
  const { t: tAccess } = useTranslation("modules.settings.access.areas");
  const scope = resourceType ? (FIELD_SCOPES[resourceType] ?? resourceType) : null;
  return (field: string, fallback?: string): string | null => {
    // Levels are diffed per area, grants.console reads as "Levels: Console"
    const [head, area, ...rest] = field.split(".");
    if (head === "grants" && area && !rest.length && isAccessArea(area)) {
      const group = scope ? t(`${scope}.grants`) : "";
      const name = tAccess(`${area}.name`);
      return known(group) ? `${group}: ${name}` : name;
    }
    const label = scope ? t(`${scope}.${field.replace(/\./g, "_")}`) : "";
    return known(label) ? label : (fallback ?? null);
  };
}

/** Name of an extra data key, unknown keys are only split into words */
export function useDetailLabel() {
  const { t } = useTranslation("modules.auditLog.detailKeys");
  const { t: tAccess } = useTranslation("modules.settings.access.areas");
  return (key: string) => {
    if (isAccessArea(key)) return tAccess(`${key}.name`);
    const label = t(key);
    return known(label) ? label : humanize(key);
  };
}

/** Access level under an area key, or an old flat permission, null for other values */
export function useAccessValueLabel() {
  const { t } = useTranslation("modules.settings.access.levels");
  const { t: tLegacy } = useTranslation("modules.auditLog.legacyPermissions");
  return (name: string | undefined, value: string): string | null => {
    if (name && isAccessArea(name) && ACCESS_LEVELS.includes(value as AccessLevel)) return t(value);
    if (name === "permissions") {
      const label = tLegacy(value);
      return known(label) ? label : value;
    }
    return null;
  };
}

/** What the entry acted on besides its server: a name, a known kind or the raw id */
export function useResourceLabel() {
  const { t } = useTranslation("modules.auditLog.resourceTypes");
  return (entry: AuditLogEntry): string | null => {
    if (entry.resourceType === "server") return null;
    if (entry.resourceName) return entry.resourceName;
    const kind = entry.resourceType ? t(entry.resourceType) : "";
    return known(kind) ? kind : (entry.resourceId ?? null);
  };
}
