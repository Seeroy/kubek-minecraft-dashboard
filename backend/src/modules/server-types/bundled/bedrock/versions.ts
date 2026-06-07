import type { VersionResolver } from "@kubekpanel/blueprint-sdk";

// Version list from the community version DB; download URLs are platform-specific minecraft.net zips
const resolver: VersionResolver = {
  async listVersions(ctx) {
    const res = await ctx.fetch("https://mrarm.io/r/w10-vdb");
    const data = (await res.json()) as unknown[][];
    return data.map((item) => ({ id: String(item[0]) })).reverse();
  },

  async resolveDownload(version, ctx) {
    const os = ctx.platform.os;
    if (os === "win32") {
      return {
        url: `https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-${version}.zip`,
        unpack: true,
      };
    }
    if (os === "linux") {
      return {
        url: `https://www.minecraft.net/bedrockdedicatedserver/bin-linux/bedrock-server-${version}.zip`,
        unpack: true,
      };
    }
    throw new Error("Bedrock servers are not supported on this platform");
  },
};

export default resolver;
