import { type ArchiveEntryHandler, walkArchive } from "@/core/utils/archives";
import { ModpackErrorCode } from "@shared/types/modpack.types";
import { createWriteStream, promises as fs } from "fs";
import { dirname } from "path";
import type { Readable } from "stream";
import { pipeline } from "stream/promises";
import { MrpackError } from "./mrpack-error";
import { jailPath, type OverrideLayer, overrideEntry } from "./mrpack-paths";
import { MRPACK_INDEX_FILE } from "./mrpack-reader";

const MAX_INDEX_BYTES = 32 * 1024 * 1024;
const MAX_OVERRIDE_BYTES = 8 * 1024 * 1024 * 1024;

/** Visit zip entries one by one, the handler must drain or consume the stream */
function walkZip(
  archivePath: string,
  onEntry: ArchiveEntryHandler,
): Promise<void> {
  // .mrpack is just a zip
  return walkArchive(archivePath, onEntry, { type: "zip" });
}

async function readAll(stream: Readable, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    size += (chunk as Buffer).length;
    if (size > limit) throw invalid("modrinth.index.json is too large");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export interface PackArchiveScan {
  index: unknown;
  hasClientOverrides: boolean;
  overrideFiles: number;
}

/** Read the index of a .mrpack and note what overrides it carries */
export async function scanPackArchive(
  archivePath: string,
): Promise<PackArchiveScan> {
  let indexBuffer: Buffer | undefined;
  let hasClientOverrides = false;
  let overrideFiles = 0;

  try {
    await walkZip(archivePath, async (header, stream) => {
      const name = header.name.replace(/^\.\//, "");
      if (header.type === "file" && name === MRPACK_INDEX_FILE) {
        indexBuffer = await readAll(stream, MAX_INDEX_BYTES);
        return;
      }
      if (name.startsWith("client-overrides/")) hasClientOverrides = true;
      if (header.type === "file" && overrideEntry(name)) overrideFiles++;
      stream.resume();
    });
  } catch (error) {
    if (error instanceof MrpackError) throw error;
    throw invalid("The file is not a readable .mrpack archive");
  }

  if (!indexBuffer) throw invalid(`${MRPACK_INDEX_FILE} is missing`);
  try {
    return {
      index: JSON.parse(indexBuffer.toString("utf8")),
      hasClientOverrides,
      overrideFiles,
    };
  } catch {
    throw invalid(`${MRPACK_INDEX_FILE} is not valid JSON`);
  }
}

/** Copy one override layer into the server folder, returns files written */
export async function extractOverrideLayer(
  archivePath: string,
  serverDir: string,
  layer: OverrideLayer,
): Promise<number> {
  let written = 0;
  let bytes = 0;
  await walkZip(archivePath, async (header, stream) => {
    const entry = header.type === "file" ? overrideEntry(header.name) : null;
    if (!entry || entry.layer !== layer) {
      stream.resume();
      return;
    }
    const target = jailPath(serverDir, entry.path);
    await fs.mkdir(dirname(target), { recursive: true });
    stream.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_OVERRIDE_BYTES) {
        stream.destroy(invalid("Overrides are too large"));
      }
    });
    await pipeline(stream, createWriteStream(target));
    written++;
  });
  return written;
}

function invalid(message: string): MrpackError {
  return new MrpackError(ModpackErrorCode.INVALID, message);
}
