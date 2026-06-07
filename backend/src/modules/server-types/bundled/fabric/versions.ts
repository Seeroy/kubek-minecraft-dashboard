import type {
  VersionResolver,
  VersionResolverContext,
} from "@kubekpanel/blueprint-sdk";

const BASE = "https://meta.fabricmc.net/v2";

interface FabricMetaVersion {
  version: string;
  stable: boolean;
}

async function latestStable(
  ctx: VersionResolverContext,
  endpoint: string,
): Promise<string> {
  const res = await ctx.fetch(`${BASE}${endpoint}`);
  const data = (await res.json()) as FabricMetaVersion[];
  const stable = data.find((v) => v.stable) ?? data[0];
  if (!stable) throw new Error(`No versions at ${endpoint}`);
  return stable.version;
}

// Fabric Meta API: the /server/jar endpoint returns a launcher jar that runs with -jar <jar> nogui
const resolver: VersionResolver = {
  async listVersions(ctx) {
    const res = await ctx.fetch(`${BASE}/versions/game`);
    const data = (await res.json()) as FabricMetaVersion[];
    return data
      .filter((v) => v.stable)
      .map((v) => ({ id: v.version, label: v.version }));
  },

  async resolveDownload(version, ctx) {
    const loader = await latestStable(ctx, "/versions/loader");
    const installer = await latestStable(ctx, "/versions/installer");
    return {
      url: `${BASE}/versions/loader/${version}/${loader}/${installer}/server/jar`,
    };
  },
};

export default resolver;
