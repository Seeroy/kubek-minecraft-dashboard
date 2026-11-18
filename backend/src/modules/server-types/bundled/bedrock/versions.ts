import type {
  VersionResolver,
  VersionResolverContext,
} from "@kubekpanel/blueprint-sdk";

// Server builds named the same way as the minecraft.net zips
const VERSIONS_URL =
  "https://raw.githubusercontent.com/Bedrock-OSS/BDS-Versions/main/versions.json";
const CDN = "https://www.minecraft.net/bedrockdedicatedserver";

interface PlatformVersions {
  stable: string;
  versions: string[];
}

interface VersionsFile {
  linux: PlatformVersions;
  windows: PlatformVersions;
}

function folderFor(os: VersionResolverContext["platform"]["os"]) {
  if (os === "win32") return { key: "windows", bin: "bin-win" } as const;
  if (os === "linux") return { key: "linux", bin: "bin-linux" } as const;
  throw new Error("Bedrock servers are not supported on this platform");
}

const resolver: VersionResolver = {
  async listVersions(ctx) {
    const { key } = folderFor(ctx.platform.os);
    const res = await ctx.fetch(VERSIONS_URL);
    if (!res.ok) {
      throw new Error(`Bedrock version list request failed: ${res.status}`);
    }
    const data = (await res.json()) as VersionsFile;
    // Oldest first in the file
    return [...data[key].versions].reverse().map((id) => ({ id }));
  },

  resolveDownload(version, ctx) {
    // Async so a bad version rejects instead of throwing
    return Promise.resolve().then(() => {
      const { bin } = folderFor(ctx.platform.os);
      // The version goes into a URL path
      if (!/^\d+(\.\d+)+$/.test(version)) {
        throw new Error(`Invalid Bedrock version: ${version}`);
      }
      return {
        url: `${CDN}/${bin}/bedrock-server-${version}.zip`,
        unpack: true,
      };
    });
  },
};

export default resolver;
