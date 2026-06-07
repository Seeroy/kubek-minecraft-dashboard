import type {
  KubekBlueprintManifest,
  VersionResolver,
} from "@kubekpanel/blueprint-sdk";

import { bedrock } from "./bedrock/blueprint";
import bedrockResolver from "./bedrock/versions";
import { custom } from "./custom";
import { fabric } from "./fabric/blueprint";
import fabricResolver from "./fabric/versions";
import { folia } from "./folia";
import { paper } from "./paper";
import { purpur } from "./purpur";
import { spigot } from "./spigot";
import { vanilla } from "./vanilla/blueprint";
import vanillaResolver from "./vanilla/versions";
import { velocity } from "./velocity";
import { waterfall } from "./waterfall";

/**
 * A bundled blueprints, statically imported
 */
export interface BundledBlueprint {
  manifest: KubekBlueprintManifest;
  resolver?: VersionResolver;
}

export const BUNDLED_BLUEPRINTS: BundledBlueprint[] = [
  { manifest: vanilla, resolver: vanillaResolver },
  { manifest: fabric, resolver: fabricResolver },
  { manifest: bedrock, resolver: bedrockResolver },
  { manifest: paper },
  { manifest: purpur },
  { manifest: spigot },
  { manifest: folia },
  { manifest: velocity },
  { manifest: waterfall },
  { manifest: custom },
];
