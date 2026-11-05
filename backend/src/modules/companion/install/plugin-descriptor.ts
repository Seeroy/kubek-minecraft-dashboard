import { readZipEntry } from "@/core/utils/zip-entry";
import { parse } from "yaml";

export interface PluginDescriptor {
  name: string;
  version: string;
}

// Paper plugins only have the second one
const DESCRIPTOR_FILES = ["plugin.yml", "paper-plugin.yml"];

/** name and version from a plugin jar, null for anything that isn't a plugin */
export async function readPluginDescriptor(
  jarPath: string,
): Promise<PluginDescriptor | null> {
  for (const entry of DESCRIPTOR_FILES) {
    const raw = await readZipEntry(jarPath, entry, 256 * 1024);
    if (!raw) continue;
    try {
      const yml = parse(raw.toString("utf8")) as Record<string, unknown> | null;
      if (yml && typeof yml.name === "string") {
        const version = yml.version;
        return {
          name: yml.name,
          version:
            typeof version === "string" || typeof version === "number"
              ? String(version)
              : "",
        };
      }
    } catch {
      // broken yaml, the server won't load it either
    }
  }
  return null;
}
