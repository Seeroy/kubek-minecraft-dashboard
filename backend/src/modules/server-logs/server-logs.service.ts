import { FileManagerService } from "@/modules/files/file-manager.service";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createReadStream, existsSync, promises as fs, lstatSync } from "fs";
import { join } from "path";
import * as readline from "readline";
import { createGunzip } from "zlib";
import { LogFileDto, LogSearchResultDto } from "./dto/log-file.dto";

const LOGS_DIR = "logs";

@Injectable()
export class ServerLogsService {
  constructor(private readonly files: FileManagerService) {}

  private logsDirFor(serverId: string): string {
    return this.files.resolveSafePath(serverId, LOGS_DIR);
  }

  private filePathFor(serverId: string, fileName: string): string {
    // Disallow path separators in filename
    if (
      fileName.includes("/") ||
      fileName.includes("\\") ||
      fileName === ".."
    ) {
      throw new BadRequestException("Invalid file name");
    }
    const safe = this.files.resolveSafePath(serverId, join(LOGS_DIR, fileName));
    return safe;
  }

  async listFiles(serverId: string): Promise<LogFileDto[]> {
    const dir = this.logsDirFor(serverId);
    if (!existsSync(dir) || !lstatSync(dir).isDirectory()) {
      return [];
    }
    const names = await fs.readdir(dir);
    const out: LogFileDto[] = [];
    for (const name of names) {
      const p = join(dir, name);
      const stat = lstatSync(p);
      if (!stat.isFile()) continue;
      if (!/\.(log|log\.gz|gz)$/i.test(name) && name !== "latest.log") continue;
      out.push({
        name,
        path: join(LOGS_DIR, name),
        size: stat.size,
        modify: stat.mtime.toISOString(),
        gzipped: /\.gz$/i.test(name),
      });
    }
    // latest.log first, then by mtime desc
    return out.sort((a, b) => {
      if (a.name === "latest.log") return -1;
      if (b.name === "latest.log") return 1;
      return new Date(b.modify).getTime() - new Date(a.modify).getTime();
    });
  }

  async readContent(
    serverId: string,
    fileName: string,
    opts: { tail?: number } = {},
  ): Promise<string> {
    const safe = this.filePathFor(serverId, fileName);
    if (!existsSync(safe) || lstatSync(safe).isDirectory()) {
      throw new NotFoundException("Log file not found");
    }

    const lines: string[] = [];
    const tailN = opts.tail && opts.tail > 0 ? opts.tail : undefined;
    const ring: string[] = [];

    await new Promise<void>((resolveP, rejectP) => {
      const fileStream = createReadStream(safe);
      const stream = /\.gz$/i.test(fileName)
        ? fileStream.pipe(createGunzip())
        : fileStream;
      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
      });

      rl.on("line", (line) => {
        if (tailN) {
          ring.push(line);
          if (ring.length > tailN) ring.shift();
        } else {
          lines.push(line);
        }
      });
      rl.on("close", () => resolveP());
      rl.on("error", (err) => rejectP(err));
      fileStream.on("error", (err) => rejectP(err));
    });

    const finalLines = tailN ? ring : lines;
    return finalLines.join("\n");
  }

  async search(
    serverId: string,
    fileName: string,
    query: string,
  ): Promise<LogSearchResultDto[]> {
    if (!query || query.trim().length === 0) return [];
    const safe = this.filePathFor(serverId, fileName);
    if (!existsSync(safe) || lstatSync(safe).isDirectory()) {
      throw new NotFoundException("Log file not found");
    }

    const needle = query.toLowerCase();
    const matches: LogSearchResultDto[] = [];
    let lineNumber = 0;

    await new Promise<void>((resolveP, rejectP) => {
      const fileStream = createReadStream(safe);
      const stream = /\.gz$/i.test(fileName)
        ? fileStream.pipe(createGunzip())
        : fileStream;
      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
      });

      rl.on("line", (line) => {
        lineNumber += 1;
        if (line.toLowerCase().includes(needle)) {
          matches.push({ lineNumber, line });
          if (matches.length >= 500) rl.close();
        }
      });
      rl.on("close", () => resolveP());
      rl.on("error", (err) => rejectP(err));
      fileStream.on("error", (err) => rejectP(err));
    });

    return matches;
  }
}
