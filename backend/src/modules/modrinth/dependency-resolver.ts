import type {
  ModrinthVersion,
  PluginInstallDependencyInput,
} from "@shared/types/plugins";
import { requiredDependencies } from "./modrinth-mappers";

export interface DependencyResolverOptions {
  /** Pull in required dependencies declared by the version */
  installRequired: boolean;
  /** Dependencies the client already picked, they win over auto resolution */
  explicit?: PluginInstallDependencyInput[];
  /** Newest version id of a project for this server, undefined if none */
  latestVersionOf: (projectId: string) => Promise<string | undefined>;
  onLookupError?: (projectId: string, error: unknown) => void;
}

/**
 * Collect the dependencies to install alongside a version, deduplicated by
 * project and version
 */
export async function resolveDependencies(
  version: ModrinthVersion,
  options: DependencyResolverOptions,
): Promise<PluginInstallDependencyInput[]> {
  const resolved: PluginInstallDependencyInput[] = [];
  const keys = new Set<string>();
  const add = (dep: PluginInstallDependencyInput) => {
    const key = `${dep.projectId}:${dep.versionId}`;
    if (keys.has(key)) return;
    keys.add(key);
    resolved.push(dep);
  };

  options.explicit?.forEach(add);
  if (!options.installRequired) return resolved;

  const explicitProjects = new Set(
    options.explicit?.map((dep) => dep.projectId),
  );
  for (const dep of requiredDependencies(version)) {
    if (explicitProjects.has(dep.projectId)) continue;
    if (dep.versionId) {
      add({ projectId: dep.projectId, versionId: dep.versionId });
      continue;
    }
    try {
      const latest = await options.latestVersionOf(dep.projectId);
      if (latest) add({ projectId: dep.projectId, versionId: latest });
    } catch (error) {
      options.onLookupError?.(dep.projectId, error);
    }
  }

  return resolved;
}
