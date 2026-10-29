import { useBlueprints, useBlueprintVersions } from "@/modules/server-types/api/server-types.queries";
import { useSystemInfoQuery } from "@/modules/system-monitoring/api/system-monitoring.queries";
import type { BlueprintSummary, KubekPlatform } from "@/shared/types/server-types.types";
import { useEffect, useEffectEvent, useMemo, type RefObject } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { buildBlueprintForm, primaryPort, type WizardValues } from "./wizard/buildBlueprintSchema";

const PREFERRED_BLUEPRINT = "com.kubek.paper";

// A blueprint may restrict itself to certain host OS
const isSupported = (bp: BlueprintSummary, platform: string | undefined) =>
  !bp.platforms?.length || !platform || bp.platforms.includes(platform as KubekPlatform);

interface UseBlueprintSelectionOptions {
  form: UseFormReturn<WizardValues>;
  schemaRef: RefObject<ReturnType<typeof buildBlueprintForm>["schema"] | null>;
  /** First port at or after the given one that no other server uses */
  freePort: (from: number) => number;
}

/**
 * Blueprint catalog filtered by the host platform, the selected blueprint with its
 * dynamic schema, and its version list. Preselects Paper and the latest version
 */
export function useBlueprintSelection({ form, schemaRef, freePort }: UseBlueprintSelectionOptions) {
  const blueprints = useBlueprints();
  const system = useSystemInfoQuery();
  const blueprintId = useWatch({ control: form.control, name: "blueprintId" });
  const platform = system.data?.platform;

  const supportedBlueprints = useMemo(
    () => (blueprints.data ?? []).filter((bp) => isSupported(bp, platform)),
    [blueprints.data, platform]
  );
  const selectedBlueprint = supportedBlueprints.find((bp) => bp.id === blueprintId);

  const versionVarKey = selectedBlueprint?.variables.find((v) => v.options?.from === "versions")?.key;
  const versions = useBlueprintVersions(versionVarKey ? blueprintId : undefined);

  const selectBlueprint = (bp: BlueprintSummary) => {
    const { schema, defaults } = buildBlueprintForm(bp);
    schemaRef.current = schema;
    form.reset({ ...defaults, name: form.getValues("name"), port: freePort(primaryPort(bp)?.default ?? 25565) });
  };

  const preselect = useEffectEvent(() => {
    selectBlueprint(supportedBlueprints.find((bp) => bp.id === PREFERRED_BLUEPRINT) ?? supportedBlueprints[0]);
  });

  useEffect(() => {
    if (!blueprintId && supportedBlueprints.length > 0) preselect();
  }, [blueprintId, supportedBlueprints]);

  // Default the version to the latest once the list loads
  useEffect(() => {
    if (!versionVarKey || !versions.data?.length) return;
    const current = form.getValues(`variables.${versionVarKey}`);
    if (!current || !versions.data.includes(String(current))) {
      form.setValue(`variables.${versionVarKey}`, versions.data[0], { shouldValidate: true });
    }
  }, [versions.data, versionVarKey, form]);

  return {
    blueprintsLoading: blueprints.isLoading,
    blueprintsError: blueprints.error,
    supportedBlueprints,
    selectedBlueprint,
    selectBlueprint,
    versionVarKey,
    versions: versions.data,
    versionsLoading: versions.isLoading,
    dockerAvailable: !!system.data?.dockerAvailable,
  };
}
