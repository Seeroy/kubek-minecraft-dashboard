import type { CreateServerDto } from "@/api";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { primaryPort, type WizardValues } from "./buildBlueprintSchema";
import { buildJvmArgs, splitArgs } from "./jvm";

interface CreatePayloadOptions {
  docker: boolean;
  dockerAvailable: boolean;
}

export function buildCreatePayload(blueprint: BlueprintSummary, values: WizardValues, { docker, dockerAvailable }: CreatePayloadOptions): CreateServerDto {
  const merged: CreateServerDto["variables"] = { ...values.variables };
  const port = primaryPort(blueprint);
  if (port) merged[port.key] = values.port;
  if (blueprint.variables.some((v) => v.key === "JVM_ARGS")) {
    merged.JVM_ARGS = buildJvmArgs({
      maxMemoryMb: Number(values.variables.XMX) || 0,
      useAikarFlags: values.aikar,
      extraArguments: splitArgs(values.extraArgs),
    }).join(" ");
  }
  // Docker images ship their own Java, a host path means nothing inside the container
  if (values.javaPath && !docker) merged.JAVA_PATH = values.javaPath;

  const payload: CreateServerDto = { name: values.name, blueprintId: blueprint.id, variables: merged };
  // Send a runtime only when the user could pick one
  if (blueprint.dockerCapable && dockerAvailable) payload.runtime = values.runtimeDocker ? "docker" : "native";
  return payload;
}
