import { open } from "fs/promises";
import { inflateRawSync } from "zlib";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
// End record is 22 bytes plus a comment of up to 64k
const EOCD_SEARCH = 22 + 0xffff;
const STORED = 0;
const DEFLATED = 8;

/**
 * Reads one small file out of a zip or jar without unpacking the rest,
 * null when it's not there or the archive is odd
 */
export async function readZipEntry(
  archivePath: string,
  entryName: string,
  maxBytes = 1024 * 1024,
): Promise<Buffer | null> {
  const file = await open(archivePath, "r");
  try {
    const { size } = await file.stat();
    const tailSize = Math.min(size, EOCD_SEARCH);
    const tail = Buffer.alloc(tailSize);
    await file.read(tail, 0, tailSize, size - tailSize);

    let eocd = -1;
    for (let i = tailSize - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === EOCD_SIGNATURE) {
        eocd = i;
        break;
      }
    }
    if (eocd === -1) return null;

    const dirSize = tail.readUInt32LE(eocd + 12);
    const dirOffset = tail.readUInt32LE(eocd + 16);
    if (dirOffset + dirSize > size) return null;
    const dir = Buffer.alloc(dirSize);
    await file.read(dir, 0, dirSize, dirOffset);

    let pos = 0;
    while (
      pos + 46 <= dir.length &&
      dir.readUInt32LE(pos) === CENTRAL_SIGNATURE
    ) {
      const method = dir.readUInt16LE(pos + 10);
      const compressedSize = dir.readUInt32LE(pos + 20);
      const plainSize = dir.readUInt32LE(pos + 24);
      const nameLength = dir.readUInt16LE(pos + 28);
      const extraLength = dir.readUInt16LE(pos + 30);
      const commentLength = dir.readUInt16LE(pos + 32);
      const localOffset = dir.readUInt32LE(pos + 42);
      const name = dir.toString("utf8", pos + 46, pos + 46 + nameLength);
      pos += 46 + nameLength + extraLength + commentLength;
      if (name !== entryName) continue;

      if (plainSize > maxBytes || compressedSize > maxBytes) return null;
      const header = Buffer.alloc(30);
      await file.read(header, 0, 30, localOffset);
      if (header.readUInt32LE(0) !== LOCAL_SIGNATURE) return null;
      const dataStart =
        localOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
      const data = Buffer.alloc(compressedSize);
      await file.read(data, 0, compressedSize, dataStart);

      if (method === STORED) return data;
      if (method === DEFLATED) {
        return inflateRawSync(data, { maxOutputLength: maxBytes });
      }
      return null;
    }
    return null;
  } catch {
    return null;
  } finally {
    await file.close();
  }
}
