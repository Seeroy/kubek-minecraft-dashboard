import { useJavaVersionForGame } from "@/modules/java-manager/api/java.queries";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { WizardValues } from "./wizard/buildBlueprintSchema";

// Fallback Java major when auto-resolution fails
const DEFAULT_JAVA_VERSION = 26;

interface UseJavaAutoResolutionOptions {
  form: UseFormReturn<WizardValues>;
  selectedBlueprint: BlueprintSummary | undefined;
  versionVarKey: string | undefined;
}

/**
 * Resolves the recommended Java major for the selected game version and keeps
 * the JAVA_VERSION field in sync
 */
export function useJavaAutoResolution({
  form,
  selectedBlueprint,
  versionVarKey,
}: UseJavaAutoResolutionOptions) {
  const variables = form.watch("variables");

  // The blueprint only needs Java auto-selection if it actually exposes a JAVA_VERSION variable
  const hasJavaVariable =
    selectedBlueprint?.variables.some((v) => v.key === "JAVA_VERSION") ?? false;

  // Recommended Java major for the currently selected Minecraft version (null for unknown/proxy versions)
  const gameVersion = versionVarKey
    ? (variables?.[versionVarKey] as string | undefined)
    : undefined;
  const { data: rawJava, isLoading: javaResolving } = useJavaVersionForGame(
    hasJavaVariable && gameVersion ? String(gameVersion) : undefined
  );

  // The backend 404s on non-Mojang versions; fallback to a known good default
  const recommendedJava = typeof rawJava === "number" ? rawJava : null;
  const javaLookupFailed =
    !javaResolving && gameVersion && !recommendedJava && rawJava != null;

  // Resolved Java major to apply: the backend recommendation, or the fallback when it 404s/errors
  const resolvedJava =
    recommendedJava ?? (javaLookupFailed ? DEFAULT_JAVA_VERSION : null);

  // Auto-pick Java to match the selected game version (falls back to the default on resolve failure)
  useEffect(() => {
    if (resolvedJava == null || !hasJavaVariable) return;
    if (form.getValues("variables.JAVA_VERSION") === resolvedJava) return;
    form.setValue("variables.JAVA_VERSION", resolvedJava, {
      shouldValidate: true,
    });
  }, [resolvedJava, hasJavaVariable, form]);

  return { javaResolving, resolvedJava };
}
