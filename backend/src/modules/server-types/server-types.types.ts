import type {
  KubekBlueprintManifest,
  VersionResolver,
} from "@kubekpanel/blueprint-sdk";

/** A blueprint as held by the registry, with its origin and validation result */
export interface LoadedBlueprint {
  manifest: KubekBlueprintManifest;
  /** absolute path of the blueprint dir (bundled or installed) */
  dir: string;
  source: "bundled" | "installed";
  valid: boolean;
  errors: string[];
  /** in-memory version resolver for bundled resolver-kind blueprints (installed ones import from disk) */
  resolver?: VersionResolver;
}

/** Values used to resolve {{...}} substitutions at version/install/start time */
export interface ResolveScope {
  [key: string]: string | number | boolean | undefined;
}

/** What ProcessRuntime/DockerRuntime needs to launch a server */
export interface LaunchSpec {
  cwd: string;
  /** resolved startup command (native) or in-container command (docker) */
  command: string;
  env: Record<string, string>;
}
