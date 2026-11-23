"use client";
import { blueprintVersionOptions, useBlueprintVersionLabels, useBlueprintVersions } from "@/modules/server-types/api/server-types.queries";
import { VersionText } from "@/modules/server-types/ui/VersionText";
import { DataReveal } from "@/shared/ui/data-reveal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useQueries } from "@tanstack/react-query";
import { SAMPLE_VERSIONS } from "../../data/samples";

interface VersionSelectProps {
  id: string;
  blueprintId: string;
  value: string;
  onChange: (version: string) => void;
}

const pick = (versions: string[], chosen: string) => (versions.includes(chosen) ? chosen : (versions[0] ?? ""));

/** A chosen version only when the blueprint offers it, otherwise its newest one */
export function useResolvedVersion(blueprintId: string, chosen: string): string {
  return pick(useBlueprintVersions(blueprintId).data ?? [], chosen);
}

/** Same as useResolvedVersion for a list of blueprint and version pairs */
export function useResolvedVersions(items: { blueprintId: string; version: string }[]): string[] {
  const ids = [...new Set(items.map((item) => item.blueprintId))];
  const lists = useQueries({
    queries: ids.map((id) => blueprintVersionOptions(id)),
  });
  return items.map((item) => pick(lists[ids.indexOf(item.blueprintId)]?.data?.map((v) => v.id) ?? [], item.version));
}

export function VersionSelect({ id, blueprintId, value, onChange }: VersionSelectProps) {
  const versions = useBlueprintVersions(blueprintId);
  const labels = useBlueprintVersionLabels(blueprintId);

  return (
    <DataReveal id={`network-version-${id}`} data={versions.data ?? []} loading={versions.isLoading} sample={SAMPLE_VERSIONS}>
      {(list) => (
        <Select value={value || null} onValueChange={(next) => next && onChange(next)}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue>{labels?.size ? (selected: string | null) => selected && <VersionText id={selected} label={labels.get(selected)} /> : undefined}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {list.map((version) => (
              <SelectItem key={version} value={version}>
                <VersionText id={version} label={labels?.get(version)} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </DataReveal>
  );
}
