import { getRealServerPath, getSafeServerPath } from "@/core/utils/serverPath";
import { promises as fs } from "fs";

type ProxyCheck = (serverId: string) => Promise<boolean>;

async function readYaml(serverId: string, file: string): Promise<unknown> {
  try {
    const text = await fs.readFile(
      await getRealServerPath(serverId, file),
      "utf8",
    );
    return Bun.YAML.parse(text);
  } catch {
    return null;
  }
}

function dig(value: unknown, path: string[]): unknown {
  return path.reduce<unknown>(
    (node, key) =>
      node && typeof node === "object"
        ? (node as Record<string, unknown>)[key]
        : undefined,
    value,
  );
}

const yamlFlag =
  (file: string, path: string[]): ProxyCheck =>
  async (serverId) =>
    dig(await readYaml(serverId, file), path) === true;

const fileExists =
  (file: string): ProxyCheck =>
  (serverId) =>
    fs.access(getSafeServerPath(serverId, file)).then(
      () => true,
      () => false,
    );

// Each forwarding setup a backend can use, the proxy hands it Mojang UUIDs
const CHECKS: ProxyCheck[] = [
  yamlFlag("config/paper-global.yml", ["proxies", "velocity", "enabled"]),
  yamlFlag("paper.yml", ["settings", "velocity-support", "enabled"]),
  yamlFlag("spigot.yml", ["settings", "bungeecord"]),
  fileExists("config/FabricProxy-Lite.toml"),
];

/** Whether the server takes player identities from a proxy */
export async function isBehindProxy(serverId: string): Promise<boolean> {
  const results = await Promise.all(CHECKS.map((check) => check(serverId)));
  return results.some(Boolean);
}
