import type {
  BlueprintFeature,
  BlueprintVariable,
  ConfigFileSpec,
  KubekPlatform,
  PortSpec,
} from "@kubekpanel/blueprint-sdk";

export type {
  BlueprintFeature,
  BlueprintVariable,
  ConfigFileSpec,
  KubekPlatform,
  PortSpec
};

/** Shape returned by GET /api/server-types (registry summary, not the full manifest) */
export interface BlueprintSummary {
  id: string;
  name: string;
  shortName?: string;
  description?: string;
  game: string;
  icon?: string;
  version: string;
  /** Restrict to these host OSes; undefined means available everywhere */
  platforms?: KubekPlatform[];
  runtimeKind: "native" | "docker";
  /** Whether the blueprint can run in Docker (has a docker profile) */
  dockerCapable?: boolean;
  variables: BlueprintVariable[];
  ports: PortSpec[];
  configFiles: ConfigFileSpec[];
  features: BlueprintFeature[];
  source: "bundled" | "installed";
}
