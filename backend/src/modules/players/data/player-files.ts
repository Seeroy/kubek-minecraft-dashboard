import { getRealServerPath } from "@/core/utils/serverPath";
import { promises as fs } from "fs";
import { posix } from "path";
import { UUID } from "./player-data";

// Bigger than any real player file, keeps a junk file from eating memory
const MAX_FILE_BYTES = 8 * 1024 * 1024;

// Both world layouts
const LAYOUTS = {
  data: ["playerdata", "players/data"],
  stats: ["stats", "players/stats"],
  advancements: ["advancements", "players/advancements"],
} as const;

const EXTENSIONS = {
  data: ".dat",
  stats: ".json",
  advancements: ".json",
} as const;

type Kind = keyof typeof LAYOUTS;

export const worldFolder = (props: Record<string, string> | null) =>
  props?.["level-name"]?.trim() || "world";

const inWorld = (serverId: string, world: string, ...parts: string[]) =>
  getRealServerPath(serverId, posix.join(world, ...parts));

async function readSmall(path: string): Promise<Buffer | null> {
  try {
    const stat = await fs.stat(path);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return null;
    return await fs.readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function readPlayerFile(
  serverId: string,
  world: string,
  kind: Kind,
  uuid: string,
) {
  let best: { data: Buffer; mtimeMs: number } | null = null;
  for (const dir of LAYOUTS[kind]) {
    const path = await inWorld(serverId, world, dir, uuid + EXTENSIONS[kind]);
    const data = await readSmall(path);
    if (!data) continue;
    const { mtimeMs } = await fs.stat(path);
    if (!best || mtimeMs > best.mtimeMs) best = { data, mtimeMs };
  }
  return best;
}

/** uuid to the last save time */
export async function listPlayerData(
  serverId: string,
  world: string,
): Promise<Map<string, number>> {
  const saved = new Map<string, number>();
  for (const dir of LAYOUTS.data) {
    const folder = await inWorld(serverId, world, dir);
    let names: string[];
    try {
      names = await fs.readdir(folder);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    for (const name of names) {
      const uuid = name.slice(0, -4);
      if (!name.endsWith(".dat") || !UUID.test(uuid)) continue;
      try {
        const { mtimeMs } = await fs.stat(posix.join(folder, name));
        const key = uuid.toLowerCase();
        saved.set(key, Math.max(saved.get(key) ?? 0, Math.round(mtimeMs)));
      } catch {
        // Gone between readdir and stat
      }
    }
  }
  return saved;
}

export async function readServerJson(
  serverId: string,
  file: string,
): Promise<unknown> {
  const data = await readSmall(await getRealServerPath(serverId, file));
  if (!data) return null;
  try {
    return JSON.parse(data.toString("utf8"));
  } catch {
    return null;
  }
}

/** Returns how many files were removed */
export async function deletePlayerFiles(
  serverId: string,
  world: string,
  uuid: string,
): Promise<number> {
  const targets: string[] = [];
  for (const kind of Object.keys(LAYOUTS) as Kind[]) {
    for (const dir of LAYOUTS[kind]) {
      const file = uuid + EXTENSIONS[kind];
      targets.push(posix.join(dir, file));
      if (kind === "data") targets.push(posix.join(dir, `${file}_old`));
    }
  }

  let deleted = 0;
  for (const target of targets) {
    try {
      await fs.unlink(await inWorld(serverId, world, target));
      deleted++;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return deleted;
}
