import type { PluginInstallDependencyInput } from "@/api";
import { ModrinthVersion } from "@shared/types/plugins";

/**
 * Required dependencies that can be auto-installed because both the project
 * and version ids are resolved
 */
export function getInstallableDependencies(
  version: ModrinthVersion | undefined,
): PluginInstallDependencyInput[] {
  if (!version?.dependencies?.length) return [];

  return version.dependencies
    .filter((dependency) => dependency.dependencyType === "required")
    .filter((dependency) =>
      Boolean(dependency.versionId && dependency.projectId),
    )
    .map((dependency) => ({
      projectId: dependency.projectId!,
      versionId: dependency.versionId!,
    }));
}

/**
 * Required dependencies that cannot be auto-installed because the project or
 * version id could not be resolved - the user must install these manually
 */
export function getMissingDependencies(version: ModrinthVersion | undefined) {
  if (!version?.dependencies?.length) return [];

  return version.dependencies
    .filter(
      (dependency) =>
        dependency.dependencyType === "required" &&
        (!dependency.versionId || !dependency.projectId),
    )
    .map((dependency) => ({
      projectId: dependency.projectId,
      versionId: dependency.versionId,
    }));
}
