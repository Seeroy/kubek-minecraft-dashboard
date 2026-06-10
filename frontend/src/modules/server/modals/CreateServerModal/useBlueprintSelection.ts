import { api } from "@/api";
import {
  useBlueprints,
  useBlueprintVersions,
} from "@/modules/server-types/api/server-types.queries";
import type {
  BlueprintSummary,
  KubekPlatform,
} from "@/shared/types/server-types.types";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MutableRefObject,
} from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  buildBlueprintForm,
  type WizardValues,
} from "./wizard/buildBlueprintSchema";

// A blueprint may restrict itself to certain host OS
function isBlueprintSupported(
  bp: BlueprintSummary,
  platform: string | null
): boolean {
  if (!bp.platforms?.length) return true;
  if (!platform) return true;
  return bp.platforms.includes(platform as KubekPlatform);
}

interface UseBlueprintSelectionOptions {
  isOpen: boolean;
  form: UseFormReturn<WizardValues>;
  schemaRef: MutableRefObject<
    ReturnType<typeof buildBlueprintForm>["schema"] | null
  >;
}

/**
 * Owns blueprint catalog state: host-platform filtering, the selected blueprint
 * and its dynamic form schema, plus version-list resolution. Auto-selects the
 * first blueprint and defaults the version field once data is available
 */
export function useBlueprintSelection({
  isOpen,
  form,
  schemaRef,
}: UseBlueprintSelectionOptions) {
  const [serverPlatform, setServerPlatform] = useState<string | null>(null);
  const [dockerAvailable, setDockerAvailable] = useState(false);

  const {
    data: blueprints,
    isLoading: blueprintsLoading,
    error: blueprintsError,
  } = useBlueprints({ enabled: isOpen });

  const blueprintId = form.watch("blueprintId");

  const supportedBlueprints = useMemo(
    () =>
      (blueprints ?? []).filter((bp) =>
        isBlueprintSupported(bp, serverPlatform)
      ),
    [blueprints, serverPlatform]
  );

  const selectedBlueprint = useMemo(
    () => supportedBlueprints.find((b) => b.id === blueprintId),
    [supportedBlueprints, blueprintId]
  );

  const versionVarKey = selectedBlueprint?.variables.find(
    (v) => v.options?.from === "versions"
  )?.key;
  const { data: versions, isLoading: versionsLoading } = useBlueprintVersions(
    versionVarKey ? blueprintId : undefined
  );

  const selectBlueprint = useCallback(
    (bp: BlueprintSummary) => {
      const { schema, defaults } = buildBlueprintForm(bp);
      schemaRef.current = schema;
      const currentName = form.getValues("name");
      form.reset({ ...defaults, name: currentName || defaults.name });
    },
    [form, schemaRef]
  );

  // Fetch host platform
  useEffect(() => {
    if (!isOpen) return;
    api.systemMonitoring
      .getSystemInfo()
      .then((info) => {
        setServerPlatform(info.platform);
        setDockerAvailable(!!info.dockerAvailable);
      })
      .catch(() => {
        setServerPlatform("unsupported");
        setDockerAvailable(false);
      });
  }, [isOpen]);

  // Auto-select the first blueprint once the list is available
  useEffect(() => {
    if (!isOpen || blueprintId || supportedBlueprints.length === 0) return;
    const preferred =
      supportedBlueprints.find((b) => b.id === "com.kubek.paper") ??
      supportedBlueprints[0];
    selectBlueprint(preferred);
  }, [isOpen, blueprintId, supportedBlueprints, selectBlueprint]);

  // Default the version field to the latest once versions load
  useEffect(() => {
    if (!versionVarKey || !versions?.length) return;
    const current = form.getValues(`variables.${versionVarKey}`);
    if (!current || !versions.includes(String(current))) {
      form.setValue(`variables.${versionVarKey}`, versions[0], {
        shouldValidate: true,
      });
    }
  }, [versions, versionVarKey, form]);

  return {
    blueprintsLoading,
    blueprintsError,
    supportedBlueprints,
    selectedBlueprint,
    selectBlueprint,
    versionVarKey,
    versions,
    versionsLoading,
    dockerAvailable,
  };
}
