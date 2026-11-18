import type {
  VersionResolver,
  VersionResolverContext,
} from "@kubekpanel/blueprint-sdk";
import { compareVersionsDesc } from "../shared/version-order";

const MAVEN = "https://maven.neoforged.net/releases/net/neoforged/neoforge";
const BUILD = /^[\w.+-]+$/;

// 21.1.x is 1.21.1, from 26 on the build starts with the game version
export function minecraftFor(build: string): string | null {
  const parts = build.split("-")[0].split(".").map(Number);
  if (parts.some(Number.isNaN) || parts.length < 3) return null;
  const [major, minor, patch] = parts;
  if (major >= 26)
    return patch ? `${major}.${minor}.${patch}` : `${major}.${minor}`;
  if (major >= 20) return minor ? `1.${major}.${minor}` : `1.${major}`;
  return null;
}

async function builds(ctx: VersionResolverContext): Promise<string[]> {
  const res = await ctx.fetch(`${MAVEN}/maven-metadata.xml`);
  if (!res.ok)
    throw new Error(`NeoForge version list request failed: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map((m) => m[1]);
}

const numeric = (build: string) => build.split("-")[0];

// Newest stable build, a beta only if there's nothing else
export function pickBuild(all: string[], minecraft: string): string | null {
  const forGame = all
    .filter((b) => minecraftFor(b) === minecraft)
    .sort((a, b) => compareVersionsDesc(numeric(a), numeric(b)));
  return forGame.find((b) => !b.includes("-")) ?? forGame[0] ?? null;
}

const resolver: VersionResolver = {
  async listVersions(ctx) {
    const games = new Set(
      (await builds(ctx))
        .map(minecraftFor)
        .filter((v): v is string => v !== null),
    );
    return [...games].sort(compareVersionsDesc).map((id) => ({ id }));
  },

  async resolveDownload(version, ctx) {
    const pinned = String(ctx.variables.NEOFORGE_VERSION ?? "").trim();
    if (pinned && !BUILD.test(pinned)) {
      throw new Error(`Invalid NeoForge version: ${pinned}`);
    }
    const build = pinned || pickBuild(await builds(ctx), version);
    if (!build) throw new Error(`No NeoForge build for Minecraft ${version}`);
    return {
      url: `${MAVEN}/${build}/neoforge-${build}-installer.jar`,
      vars: { NEOFORGE_BUILD: build },
    };
  },
};

export default resolver;
