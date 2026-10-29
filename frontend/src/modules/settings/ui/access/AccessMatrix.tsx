"use client";

import { cn } from "@/shared/lib/cn";
import { Checkbox } from "@/shared/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { ACCESS_LEVELS, type AccessArea, type AccessLevel, type AccessMap, AREA_LEVELS, levelAtLeast } from "@shared/access/areas";
import type { UserAccess } from "@shared/access/can";
import { Info, KeyRound, TriangleAlert } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { AREA_GROUPS, AREA_ICONS, dangerousLevels, isDangerous, lowerLevel, useAccessLabels } from "../../data/access-areas";

export interface InheritedRole {
  name: string;
  grants: AccessMap;
  ext: string[];
}

export interface ExtOption {
  key: string;
  label: string;
}

interface AccessMatrixProps {
  value: AccessMap;
  onChange?: (next: AccessMap) => void;
  ext?: string[];
  onExtChange?: (next: string[]) => void;
  extOptions?: ExtOption[];
  // Roles the levels come from, shown checked and locked under the own ones
  inherited?: InheritedRole[];
  // Access of whoever edits, null for admins who may give anything
  limit?: UserAccess | null;
  readOnly?: boolean;
  className?: string;
}

interface CellState {
  checked: boolean;
  disabled: boolean;
  roles: string[];
  aboveOwn: boolean;
}

function Hint({ content, children, className }: { content: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={className} />}>{children}</TooltipTrigger>
      <TooltipContent className="grid max-w-64 gap-0.5 text-left leading-snug">{content}</TooltipContent>
    </Tooltip>
  );
}

/** Area by level grid, a checked cell means the area is at least that level */
export function AccessMatrix({
  value,
  onChange,
  ext = [],
  onExtChange,
  extOptions = [],
  inherited = [],
  limit = null,
  readOnly,
  className,
}: AccessMatrixProps) {
  const labels = useAccessLabels();
  const { t } = labels;
  const locked = readOnly || !onChange;
  const extLocked = readOnly || !onExtChange;

  const inheritedLevel = (area: AccessArea) =>
    inherited.reduce<AccessLevel | undefined>((max, role) => {
      const level = role.grants[area];
      return level && !levelAtLeast(max, level) ? level : max;
    }, undefined);

  const cellState = (area: AccessArea, level: AccessLevel): CellState => {
    const roles = inherited.filter((role) => levelAtLeast(role.grants[area], level)).map((role) => role.name);
    const aboveOwn = !!limit && !levelAtLeast(limit.levels[area], level);
    return {
      checked: roles.length > 0 || levelAtLeast(value[area], level),
      disabled: locked || roles.length > 0 || aboveOwn,
      roles,
      aboveOwn,
    };
  };

  // A personal level the roles already cover is dropped instead of kept twice
  const withLevel = (map: AccessMap, area: AccessArea, level: AccessLevel | undefined): AccessMap => {
    const next = { ...map };
    if (!level || levelAtLeast(inheritedLevel(area), level)) delete next[area];
    else next[area] = level;
    return next;
  };

  const toggleCell = (area: AccessArea, level: AccessLevel) => {
    if (!onChange) return;
    onChange(withLevel(value, area, levelAtLeast(value[area], level) ? lowerLevel(area, level) : level));
  };

  const columnAreas = (level: AccessLevel) => AREA_GROUPS.flatMap((group) => group.areas).filter((area) => AREA_LEVELS[area].includes(level));

  const columnState = (level: AccessLevel) => {
    const states = columnAreas(level).map((area) => ({ area, ...cellState(area, level) }));
    const checked = states.filter((state) => state.checked).length;
    return {
      all: states.length > 0 && checked === states.length,
      some: checked > 0 && checked < states.length,
      editable: states.filter((state) => !state.disabled),
    };
  };

  const toggleColumn = (level: AccessLevel) => {
    if (!onChange) return;
    const { all, editable } = columnState(level);
    let next = value;
    for (const { area, checked } of editable) {
      if (all && levelAtLeast(next[area], level)) next = withLevel(next, area, lowerLevel(area, level));
      else if (!all && !checked) next = withLevel(next, area, level);
    }
    onChange(next);
  };

  const toggleExt = (key: string, on: boolean) => onExtChange?.(on ? [...ext, key] : ext.filter((item) => item !== key));

  const cellHint = (area: AccessArea, level: AccessLevel, state: CellState) => (
    <>
      <b className="font-semibold">{labels.level(level)}</b>
      <span>{labels.cell(area, level)}</span>
      {isDangerous(area, level) && <span className="tone-orange text-tone">{labels.danger(area, level)}</span>}
      {state.roles.length > 0 && <span className="opacity-70">{t("fromRoles", state.roles.join(", "))}</span>}
      {state.aboveOwn && !state.roles.length && <span className="opacity-70">{t("aboveOwn")}</span>}
    </>
  );

  const areaHint = (area: AccessArea) => {
    const risky = dangerousLevels(area);
    return (
      <>
        {risky.length > 0 && <b className="tone-orange font-semibold text-tone">{t("dangerTitle")}</b>}
        <span>{labels.areaHint(area)}</span>
        {risky.map((level) => (
          <span key={level} className="tone-orange text-tone">
            {labels.level(level)}: {labels.danger(area, level)}
          </span>
        ))}
      </>
    );
  };

  return (
    <div className={cn("min-w-0 overflow-hidden rounded-lg border border-border bg-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-[13px]">
          <thead className="bg-subtle">
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left align-bottom">
                <span className="label-caps">{t("header")}</span>
              </th>
              {ACCESS_LEVELS.map((level) => {
                const column = columnState(level);
                return (
                  <th key={level} className="w-[92px] px-2 py-2 align-bottom">
                    <span className="flex flex-col items-center gap-1.5">
                      <span className="text-[11.5px] font-medium whitespace-nowrap text-muted-foreground">{labels.level(level)}</span>
                      <Hint content={t("toggleColumn", labels.level(level))}>
                        <Checkbox
                          aria-label={t("toggleColumn", labels.level(level))}
                          checked={column.all}
                          indeterminate={column.some}
                          disabled={locked || column.editable.length === 0}
                          onCheckedChange={() => toggleColumn(level)}
                        />
                      </Hint>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {AREA_GROUPS.map((group) => (
              <Fragment key={group.id}>
                <tr>
                  <td colSpan={ACCESS_LEVELS.length + 1} className="px-4 pt-3.5 pb-1">
                    <span className="label-caps">{t(`groups.${group.id}`)}</span>
                  </td>
                </tr>
                {group.areas.map((area) => {
                  const Icon = AREA_ICONS[area];
                  const active = !!value[area] || !!inheritedLevel(area);
                  return (
                    <tr key={area} className="transition-colors duration-150 hover:bg-hover">
                      <td className="py-1.5 pr-3 pl-4">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition-colors [&_svg]:size-3.5",
                              active && "bg-primary/12 text-primary"
                            )}
                          >
                            <Icon />
                          </span>
                          <span className="truncate font-medium">{labels.area(area)}</span>
                          <Hint
                            content={areaHint(area)}
                            className={cn(
                              "-ml-1 inline-flex shrink-0 [&_svg]:size-3.5",
                              dangerousLevels(area).length > 0 ? "tone-orange text-tone" : "text-muted-foreground/70"
                            )}
                          >
                            {dangerousLevels(area).length > 0 ? <TriangleAlert aria-label={t("dangerTitle")} /> : <Info />}
                          </Hint>
                        </span>
                      </td>
                      {ACCESS_LEVELS.map((level) => {
                        if (!AREA_LEVELS[area].includes(level)) {
                          return (
                            <td key={level} className="px-2 py-1.5 text-center">
                              <Hint content={t("noLevel")} className="text-muted-foreground/60 select-none">
                                —
                              </Hint>
                            </td>
                          );
                        }
                        const state = cellState(area, level);
                        return (
                          <td key={level} className="px-2 py-1.5 text-center">
                            <Hint content={cellHint(area, level, state)} className="inline-flex align-middle">
                              <Checkbox
                                aria-label={`${labels.area(area)}: ${labels.level(level)}`}
                                checked={state.checked}
                                disabled={state.disabled}
                                onCheckedChange={() => toggleCell(area, level)}
                              />
                            </Hint>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
            {extOptions.length > 0 && (
              <>
                <tr>
                  <td colSpan={ACCESS_LEVELS.length + 1} className="px-4 pt-3.5 pb-1">
                    <span className="label-caps">{t("groups.extensions")}</span>
                  </td>
                </tr>
                {extOptions.map(({ key, label }) => {
                  const roles = inherited.filter((role) => role.ext.includes(key)).map((role) => role.name);
                  const aboveOwn = !!limit && !limit.ext.includes(key);
                  const checked = roles.length > 0 || ext.includes(key);
                  return (
                    <tr key={key} className="transition-colors duration-150 hover:bg-hover">
                      <td className="py-1.5 pr-3 pl-4">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground [&_svg]:size-3.5",
                              checked && "bg-primary/12 text-primary"
                            )}
                          >
                            <KeyRound />
                          </span>
                          <Hint content={<span className="font-mono text-[11px]">{key}</span>} className="truncate font-medium">
                            {label}
                          </Hint>
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Hint
                          className="inline-flex align-middle"
                          content={
                            <>
                              <span>{t("extHint")}</span>
                              {roles.length > 0 && <span className="opacity-70">{t("fromRoles", roles.join(", "))}</span>}
                              {aboveOwn && !roles.length && <span className="opacity-70">{t("aboveOwn")}</span>}
                            </>
                          }
                        >
                          <Checkbox
                            aria-label={label}
                            checked={checked}
                            disabled={extLocked || roles.length > 0 || aboveOwn}
                            onCheckedChange={(on) => toggleExt(key, on)}
                          />
                        </Hint>
                      </td>
                      <td colSpan={ACCESS_LEVELS.length - 1} />
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
