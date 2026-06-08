import { BadRequestException } from "@nestjs/common";
import compressing from "compressing";
import fs, { createWriteStream } from "fs";
import path, { join, resolve, sep } from "path";

type ArchiveType = "zip" | "tar" | "tgz";

function detectArchiveType(archivePath: string): ArchiveType {
  const lower = archivePath.toLowerCase();
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) return "tgz";
  if (lower.endsWith(".tar")) return "tar";
  return "zip";
}

// Unpack archive with per-entry path validation
export const unpackArchive = async (
  archivePath: string,
  unpackPath: string,
  deleteAfterUnpack = false,
): Promise<boolean> => {
  fs.mkdirSync(unpackPath, { recursive: true });

  const archiveType = detectArchiveType(archivePath);
  const destRoot = resolve(unpackPath);

  try {
    await new Promise<void>((resolveUnpack, rejectUnpack) => {
      const UncompressStream = (compressing as any)[archiveType]
        .UncompressStream;
      const stream = new UncompressStream({ source: archivePath });

      const fail = (err: Error) => {
        stream.destroy();
        rejectUnpack(err);
      };

      stream.on("error", fail);
      stream.on("finish", () => resolveUnpack());

      stream.on("entry", (header: any, entryStream: any, next: () => void) => {
        const outPath = resolve(join(destRoot, header.name));

        // Reject entries that resolve outside the destination root
        if (outPath !== destRoot && !outPath.startsWith(destRoot + sep)) {
          entryStream.resume();
          fail(
            new BadRequestException(
              "Archive contains entries with unsafe paths",
            ),
          );
          return;
        }

        if (header.type === "directory") {
          fs.promises
            .mkdir(outPath, { recursive: true })
            .then(() => {
              entryStream.resume();
              next();
            })
            .catch(fail);
          return;
        }

        // Skip symlinks and other special entries to avoid escapes
        if (header.type && header.type !== "file") {
          entryStream.resume();
          next();
          return;
        }

        fs.promises
          .mkdir(path.dirname(outPath), { recursive: true })
          .then(() => {
            const out = createWriteStream(outPath);
            entryStream.pipe(out);
            out.on("finish", next);
            out.on("error", fail);
          })
          .catch(fail);
      });
    });

    if (deleteAfterUnpack) {
      fs.unlinkSync(archivePath);
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
