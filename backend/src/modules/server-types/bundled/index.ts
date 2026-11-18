import type {
  KubekBlueprintManifest,
  VersionResolver,
} from "@kubekpanel/blueprint-sdk";

import { bedrock } from "./bedrock/blueprint";
import bedrockResolver from "./bedrock/versions";
import { custom } from "./custom";
import { fabric } from "./fabric/blueprint";
import fabricResolver from "./fabric/versions";
import { forge } from "./forge/blueprint";
import forgeResolver from "./forge/versions";
import { folia } from "./folia";
import { neoforge } from "./neoforge/blueprint";
import neoforgeResolver from "./neoforge/versions";
import { paper } from "./paper";
import { purpur } from "./purpur";
import { quilt } from "./quilt/blueprint";
import quiltResolver from "./quilt/versions";
import { spigot } from "./spigot/blueprint";
import spigotResolver from "./spigot/versions";
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
  { manifest: neoforge, resolver: neoforgeResolver },
  { manifest: forge, resolver: forgeResolver },
  { manifest: quilt, resolver: quiltResolver },
  { manifest: bedrock, resolver: bedrockResolver },
  { manifest: paper },
  { manifest: purpur },
  { manifest: spigot, resolver: spigotResolver },
  { manifest: folia },
  { manifest: velocity },
  { manifest: waterfall },
  { manifest: custom },
];
