import type { PluginInstallDependencyInput } from "@/api";
import { ModrinthVersion } from "@shared/types/plugins";

/**
 * Required dependencies that can be auto-installed because both the project
 * and version ids are resolved
 */
export function getInstallableDependencies(version: ModrinthVersion | undefined): PluginInstallDependencyInput[] {
  if (!version?.dependencies?.length) return [];

  return version.dependencies
    .filter((dependency) => dependency.dependency_type === "required")
    .filter((dependency) => Boolean(dependency.version_id && dependency.project_id))
    .map((dependency) => ({
      projectId: dependency.project_id!,
      versionId: dependency.version_id!,
    }));
}

/**
 * Required dependencies that cannot be auto-installed because the project or
 * version id could not be resolved - the user must install these manually
 */
export function getMissingDependencies(version: ModrinthVersion | undefined) {
  if (!version?.dependencies?.length) return [];

  return version.dependencies
    .filter((dependency) => dependency.dependency_type === "required" && (!dependency.version_id || !dependency.project_id))
    .map((dependency) => ({
      projectId: dependency.project_id ?? undefined,
      versionId: dependency.version_id ?? undefined,
    }));
}
