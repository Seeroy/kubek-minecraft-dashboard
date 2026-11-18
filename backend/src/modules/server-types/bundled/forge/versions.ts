import type {
  VersionResolver,
  VersionResolverContext,
} from "@kubekpanel/blueprint-sdk";
import { compareVersionsDesc } from "../shared/version-order";

const PROMOTIONS =
  "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json";
const MAVEN = "https://maven.minecraftforge.net/net/minecraftforge/forge";
// Older Forge has no args file to launch through
const OLDEST = "1.17";
const BUILD = /^[\w.+-]+$/;

interface Promotions {
  promos: Record<string, string>;
}

async function promotions(
  ctx: VersionResolverContext,
): Promise<Record<string, string>> {
  const res = await ctx.fetch(PROMOTIONS);
  if (!res.ok)
    throw new Error(`Forge version list request failed: ${res.status}`);
  return ((await res.json()) as Promotions).promos;
}

const resolver: VersionResolver = {
  async listVersions(ctx) {
    const games = new Set(
      Object.keys(await promotions(ctx)).map((key) =>
        key.replace(/-(latest|recommended)$/, ""),
      ),
    );
    return [...games]
      .filter((v) => /^\d+(\.\d+)+$/.test(v))
      .filter((v) => compareVersionsDesc(v, OLDEST) <= 0)
      .sort(compareVersionsDesc)
      .map((id) => ({ id }));
  },

  async resolveDownload(version, ctx) {
    if (!/^\d+(\.\d+)+$/.test(version)) {
      throw new Error(`Invalid Minecraft version: ${version}`);
    }
    const pinned = String(ctx.variables.FORGE_VERSION ?? "").trim();
    if (pinned && !BUILD.test(pinned)) {
      throw new Error(`Invalid Forge version: ${pinned}`);
    }
    let forge = pinned;
    if (!forge) {
      const promos = await promotions(ctx);
      forge = promos[`${version}-recommended`] ?? promos[`${version}-latest`];
    }
    if (!forge) throw new Error(`No Forge build for Minecraft ${version}`);
    const build = `${version}-${forge}`;
    return {
      url: `${MAVEN}/${build}/forge-${build}-installer.jar`,
      vars: { FORGE_BUILD: build },
    };
  },
};

export default resolver;
