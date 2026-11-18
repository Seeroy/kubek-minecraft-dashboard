import type {
  VersionResolver,
  VersionResolverContext,
} from "@kubekpanel/blueprint-sdk";
import { compareVersionsDesc } from "../shared/version-order";

// One request lists every jar getbukkit has
const API = "https://getbukkit.org/api/jars";
const CDN = "https://cdn.getbukkit.org";

interface Jar {
  version: string;
  downloadUrl: string;
}

async function spigotJars(ctx: VersionResolverContext): Promise<Jar[]> {
  const res = await ctx.fetch(API);
  if (!res.ok)
    throw new Error(`Spigot version list request failed: ${res.status}`);
  const data = (await res.json()) as { spigot?: Jar[] };
  const jars = (data.spigot ?? []).filter((j) =>
    /^\d+(\.\d+)+$/.test(j.version),
  );
  if (!jars.length) throw new Error("getbukkit lists no Spigot versions");
  return jars;
}

const resolver: VersionResolver = {
  async listVersions(ctx) {
    return (await spigotJars(ctx))
      .map((j) => j.version)
      .sort(compareVersionsDesc)
      .map((id) => ({ id }));
  },

  async resolveDownload(version, ctx) {
    const jar = (await spigotJars(ctx)).find((j) => j.version === version);
    if (!jar) throw new Error(`Spigot ${version} is not on getbukkit`);
    return { url: new URL(jar.downloadUrl, CDN).href };
  },
};

export default resolver;
