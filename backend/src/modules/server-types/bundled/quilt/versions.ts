import type {
  VersionResolver,
  VersionResolverContext,
} from "@kubekpanel/blueprint-sdk";

const META = "https://meta.quiltmc.org/v3/versions";
const LOADER = /^[\w.+-]+$/;

interface GameVersion {
  version: string;
  stable: boolean;
}

interface LoaderEntry {
  version: string;
}

interface InstallerEntry {
  version: string;
  url: string;
}

async function json<T>(ctx: VersionResolverContext, path: string): Promise<T> {
  const res = await ctx.fetch(`${META}${path}`);
  if (!res.ok) throw new Error(`Quilt meta request failed: ${res.status}`);
  return (await res.json()) as T;
}

const resolver: VersionResolver = {
  async listVersions(ctx) {
    const games = await json<GameVersion[]>(ctx, "/game");
    return games.filter((g) => g.stable).map((g) => ({ id: g.version }));
  },

  async resolveDownload(version, ctx) {
    if (!/^[\w.+-]+$/.test(version)) {
      throw new Error(`Invalid Minecraft version: ${version}`);
    }
    const pinned = String(ctx.variables.QUILT_LOADER_VERSION ?? "").trim();
    if (pinned && !LOADER.test(pinned)) {
      throw new Error(`Invalid Quilt loader version: ${pinned}`);
    }
    let loader = pinned;
    if (!loader) {
      // Newest first and the same for every game version, unlike /loader/<game>
      const loaders = await json<LoaderEntry[]>(ctx, "/loader");
      const versions = loaders.map((l) => l.version);
      loader = versions.find((v) => !v.includes("-")) ?? versions[0] ?? "";
    }
    if (!loader) throw new Error(`No Quilt loader for Minecraft ${version}`);

    const [installer] = await json<InstallerEntry[]>(ctx, "/installer");
    if (!installer) throw new Error("No Quilt installer published");
    // The variable pins the loader on the server, so reinstalls get the same one
    return {
      url: installer.url,
      vars: { QUILT_LOADER: loader, QUILT_LOADER_VERSION: loader },
    };
  },
};

export default resolver;
