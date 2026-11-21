import type { BlueprintSummary } from "@/shared/types/server-types.types";
import type { WizardValues } from "./buildBlueprintSchema";

interface CreationSummaryOptions {
  variables: WizardValues["variables"] | undefined;
  versionVarKey: string | undefined;
  port: number;
  memoryUnit: string;
}

export function creationSummary(blueprint: BlueprintSummary, { variables, versionVarKey, port, memoryUnit }: CreationSummaryOptions) {
  return [
    [blueprint.shortName ?? blueprint.name, versionVarKey && variables?.[versionVarKey]].filter(Boolean).join(" "),
    variables?.JAVA_VERSION && `Java ${variables.JAVA_VERSION}`,
    variables?.XMX && `${variables.XMX} ${memoryUnit}`,
    `${port}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
