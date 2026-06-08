import type {
  VersionResolver,
  VersionResolverContext,
} from "@kubekpanel/blueprint-sdk";

type ResolverFetch = VersionResolverContext["fetch"];

// Official Mojang launcher metadata
const MANIFEST =
  "https://launchermeta.mojang.com/mc/game/version_manifest.json";

interface VersionManifest {
  versions: { id: string; type: string; url: string }[];
}

interface VersionMeta {
  downloads?: { server?: { url: string } };
}

async function fetchManifest(ctx: {
  fetch: ResolverFetch;
}): Promise<VersionManifest> {
  const res = await ctx.fetch(MANIFEST);
  if (!res.ok) throw new Error(`Mojang manifest request failed: ${res.status}`);
  return (await res.json()) as VersionManifest;
}

const resolver: VersionResolver = {
  async listVersions(ctx) {
    const manifest = await fetchManifest(ctx);
    // manifest is already newest-first; keep only stable releases
    return manifest.versions
      .filter((v) => v.type === "release")
      .map((v) => ({ id: v.id, label: v.id }));
  },

  async resolveDownload(version, ctx) {
    const manifest = await fetchManifest(ctx);
    const entry = manifest.versions.find((v) => v.id === version);
    if (!entry)
      throw new Error(`Version ${version} not found in Mojang manifest`);

    const metaRes = await ctx.fetch(entry.url);
    if (!metaRes.ok)
      throw new Error(`Version metadata request failed: ${metaRes.status}`);
    const meta = (await metaRes.json()) as VersionMeta;

    const url = meta.downloads?.server?.url;
    if (!url) throw new Error(`Version ${version} has no server download`);
    return { url };
  },
};

export default resolver;
