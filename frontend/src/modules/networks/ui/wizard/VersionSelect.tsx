"use client";
import { api } from "@/api";
import { useBlueprintVersions } from "@/modules/server-types/api/server-types.queries";
import { qk } from "@/shared/queries/query-keys";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { useQueries } from "@tanstack/react-query";

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
    queries: ids.map((id) => ({
      queryKey: qk.serverTypes.versions(id),
      queryFn: () => api.serverTypes.getVersions(id),
    })),
  });
  return items.map((item) => pick(lists[ids.indexOf(item.blueprintId)]?.data ?? [], item.version));
}

export function VersionSelect({ id, blueprintId, value, onChange }: VersionSelectProps) {
  const versions = useBlueprintVersions(blueprintId);

  if (versions.isLoading) return <Skeleton className="h-9 rounded-md" />;

  return (
    <Select value={value || null} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(versions.data ?? []).map((version) => (
          <SelectItem key={version} value={version}>
            {version}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
