import type { AccessMapDto } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { AccessArea, type AccessLevel, type AccessMap, AREA_LEVELS, PANEL_AREAS, SERVER_AREAS } from "@shared/access/areas";
import {
  Activity,
  Archive,
  Blocks,
  CalendarClock,
  Cloud,
  Coffee,
  Cog,
  FolderOpen,
  Network,
  Power,
  Puzzle,
  ScrollText,
  Server,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useCallback } from "react";

export const AREA_ICONS: Record<AccessArea, LucideIcon> = {
  [AccessArea.CONSOLE]: Terminal,
  [AccessArea.POWER]: Power,
  [AccessArea.SETTINGS]: SlidersHorizontal,
  [AccessArea.FILES]: FolderOpen,
  [AccessArea.CONTENT]: Puzzle,
  [AccessArea.PLAYERS]: UsersRound,
  [AccessArea.BACKUPS]: Archive,
  [AccessArea.SCHEDULER]: CalendarClock,
  [AccessArea.SERVERS]: Server,
  [AccessArea.NETWORKS]: Network,
  [AccessArea.ACCOUNTS]: Users,
  [AccessArea.AUDIT]: ScrollText,
  [AccessArea.MONITORING]: Activity,
  [AccessArea.JAVA]: Coffee,
  [AccessArea.STORAGES]: Cloud,
  [AccessArea.INTEGRATIONS]: Blocks,
  [AccessArea.ASSISTANT]: Sparkles,
  [AccessArea.PANEL]: Cog,
};

export const AREA_GROUPS: readonly { id: "servers" | "panel"; areas: readonly AccessArea[] }[] = [
  { id: "servers", areas: SERVER_AREAS },
  { id: "panel", areas: PANEL_AREAS },
];

const ORDERED_AREAS = AREA_GROUPS.flatMap((group) => group.areas);

/** Next lower level the area has below the given one, undefined for none */
export function lowerLevel(area: AccessArea, level: AccessLevel): AccessLevel | undefined {
  const levels = AREA_LEVELS[area];
  return levels[levels.indexOf(level) - 1];
}

/** Areas with any level, in matrix order */
export function grantedAreas(map: AccessMap): [AccessArea, AccessLevel][] {
  return ORDERED_AREAS.flatMap((area) => {
    const level = map[area];
    return level ? [[area, level] as [AccessArea, AccessLevel]] : [];
  });
}

// The API types areas loosely, only levels the area really has are kept
export function toAccessMap(value: Partial<Record<string, string>> | null | undefined): AccessMap {
  const map: AccessMap = {};
  for (const area of ORDERED_AREAS) {
    const level = value?.[area];
    if (level && (AREA_LEVELS[area] as readonly string[]).includes(level)) map[area] = level as AccessLevel;
  }
  return map;
}

// The DTO spells out levels per area, toAccessMap already keeps only those
export const toAccessMapDto = (map: AccessMap) => map as AccessMapDto;

// Levels that run foreign code, destroy data or hand out access, marked orange in the matrix
const DANGEROUS: Partial<Record<AccessArea, readonly AccessLevel[]>> = {
  [AccessArea.CONSOLE]: ["write"],
  [AccessArea.POWER]: ["manage"],
  [AccessArea.SETTINGS]: ["manage"],
  [AccessArea.FILES]: ["write", "manage"],
  [AccessArea.CONTENT]: ["write"],
  [AccessArea.PLAYERS]: ["manage"],
  [AccessArea.BACKUPS]: ["manage"],
  [AccessArea.SERVERS]: ["write"],
  [AccessArea.ACCOUNTS]: ["write", "manage"],
  [AccessArea.JAVA]: ["manage"],
  [AccessArea.STORAGES]: ["manage"],
  [AccessArea.INTEGRATIONS]: ["manage"],
  [AccessArea.ASSISTANT]: ["manage"],
  [AccessArea.PANEL]: ["manage"],
};

export const dangerousLevels = (area: AccessArea): readonly AccessLevel[] => DANGEROUS[area] ?? [];

export const isDangerous = (area: AccessArea, level: AccessLevel) => dangerousLevels(area).includes(level);

/** Translated names and descriptions of areas and levels */
export function useAccessLabels() {
  const { t } = useTranslation("modules.settings.access");
  const area = useCallback((value: AccessArea) => t(`areas.${value}.name`), [t]);
  const areaHint = useCallback((value: AccessArea) => t(`areas.${value}.hint`), [t]);
  const level = useCallback((value: AccessLevel) => t(`levels.${value}`), [t]);
  const cell = useCallback((value: AccessArea, lvl: AccessLevel) => t(`areas.${value}.${lvl}`), [t]);
  const danger = useCallback((value: AccessArea, lvl: AccessLevel) => t(`danger.${value}.${lvl}`), [t]);
  return { t, area, areaHint, level, cell, danger };
}

const BUILTIN_KEYS = ["viewer", "moderator", "operator", "server-admin"];
const isBuiltin = (key: string | null | undefined): key is string => !!key && BUILTIN_KEYS.includes(key);

/** Built-in roles read in the panel language, custom ones keep their name */
export function useRoleLabels() {
  const { t } = useTranslation("modules.settings.roles.builtin");
  const name = useCallback(
    (role: { name: string; builtinKey?: string | null }) => (isBuiltin(role.builtinKey) ? t(`${role.builtinKey}.name`) : role.name),
    [t]
  );
  const description = useCallback(
    (role: { description: string | null; builtinKey?: string | null }) =>
      role.description || (isBuiltin(role.builtinKey) ? t(`${role.builtinKey}.description`) : null),
    [t]
  );
  return { name, description };
}
