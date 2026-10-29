import { writeFileAtomic } from "@/core/utils/atomicWrite";
import { getRealServerPath } from "@/core/utils/serverPath";
import { InternalServerErrorException } from "@nestjs/common";
import type { PlayerList } from "@shared/types/players.types";
import { promises as fs } from "fs";
import { LIST_FILES, type RawEntry } from "./list-codec";

export class ListFileUnreadableError extends Error {}

// the server can swap these files for links
const listPath = (serverId: string, list: PlayerList) =>
  getRealServerPath(serverId, LIST_FILES[list]);

/** Raw entries, a missing file is an empty list */
export async function readListFile(
  serverId: string,
  list: PlayerList,
): Promise<RawEntry[]> {
  let text: string;
  try {
    text = await fs.readFile(await listPath(serverId, list), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  if (!text.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed.filter(
      (entry): entry is RawEntry => !!entry && typeof entry === "object",
    );
  } catch {
    // The server writes in place, a poll can catch the file half written
    throw new ListFileUnreadableError(LIST_FILES[list]);
  }
}

/** Same as readListFile but with an HTTP error for a broken file */
export async function readListFileOrFail(
  serverId: string,
  list: PlayerList,
): Promise<RawEntry[]> {
  try {
    return await readListFile(serverId, list);
  } catch (error) {
    if (!(error instanceof ListFileUnreadableError)) throw error;
    throw new InternalServerErrorException(
      `${LIST_FILES[list]} is not a valid player list`,
    );
  }
}

// Two space indent matches what the server itself writes
export async function writeListFile(
  serverId: string,
  list: PlayerList,
  raw: RawEntry[],
): Promise<void> {
  await writeFileAtomic(
    await listPath(serverId, list),
    JSON.stringify(raw, null, 2) + "\n",
  );
}
