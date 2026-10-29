import { getSafeServerPath } from "@/core/utils/serverPath";
import { AccessArea, type AccessLevel } from "@shared/access/areas";
import { can, canOnServer } from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";
import * as fs from "fs";
import { dirname, sep } from "path";
import { PassThrough, type Readable, type Writable } from "stream";

type Callback<T = void> = (
  err: NodeJS.ErrnoException | null,
  value?: T,
) => void;

export interface FtpFsOptions {
  /** Current account, read on every call so revoked rights apply right away */
  getUser: () => IUser | null;
  /** Ids of all servers known to the panel */
  listServerIds: () => string[];
}

/** Path inside the virtual FTP tree, a null server means the root listing */
interface Target {
  serverId: string | null;
  rel: string;
}

const DIR_MODE = 0o040755;

function fsError(code: string, message: string): NodeJS.ErrnoException {
  const err = new Error(`${code}: ${message}`) as NodeJS.ErrnoException;
  err.code = code;
  return err;
}

function isInside(base: string, full: string): boolean {
  return full === base || full.startsWith(base + sep);
}

// Fake stats for the root folder with the server list
function rootStats(): fs.Stats {
  const now = new Date();
  return {
    isDirectory: () => true,
    isFile: () => false,
    isSymbolicLink: () => false,
    mode: DIR_MODE,
    size: 0,
    uid: 0,
    gid: 0,
    mtime: now,
    atime: now,
    ctime: now,
    birthtime: now,
  } as unknown as fs.Stats;
}

/**
 * fs for one ftpd session, the first path segment is the server id
 * Every call checks rights and that the real path stays in the server folder
 */
export class FtpFs {
  constructor(private readonly opts: FtpFsOptions) {}

  /** Splits a virtual path into server id and relative part */
  parse(virtualPath: string): Target {
    const parts = String(virtualPath ?? "")
      .split(/[\\/]+/)
      .filter((part) => part && part !== ".");
    if (parts.includes("..")) throw fsError("EACCES", "path traversal");
    if (parts.length === 0) return { serverId: null, rel: "" };
    return { serverId: parts[0], rel: parts.slice(1).join("/") };
  }

  private user(level: AccessLevel = "read"): IUser {
    const user = this.opts.getUser();
    if (!user || !can(user, AccessArea.FILES, level)) {
      throw fsError("EACCES", `files ${level} access required`);
    }
    return user;
  }

  private allowedServerIds(): string[] {
    const user = this.user();
    return this.opts
      .listServerIds()
      .filter((id) => canOnServer(user, AccessArea.FILES, "read", id));
  }

  /** Server folder, unknown and foreign servers look like they don't exist */
  private serverBase(serverId: string, level: AccessLevel = "read"): string {
    const user = this.user(level);
    const known = this.opts.listServerIds().includes(serverId);
    if (!known || !canOnServer(user, AccessArea.FILES, level, serverId)) {
      throw fsError("ENOENT", "no such server");
    }
    const base = getSafeServerPath(serverId);
    try {
      return fs.realpathSync(base);
    } catch {
      throw fsError("ENOENT", "server directory missing");
    }
  }

  /**
   * Absolute path of an entry. With mustExist false the closest existing
   * parent is checked, for paths we are about to create
   */
  resolve(
    virtualPath: string,
    mustExist = true,
    level: AccessLevel = "read",
  ): string {
    const { serverId, rel } = this.parse(virtualPath);
    if (!serverId) throw fsError("EACCES", "virtual root");
    const base = this.serverBase(serverId, level);
    // Path text first, then the real path
    const full = getSafeServerPath(serverId, rel);
    assertRealInside(base, full, mustExist);
    return full;
  }

  /** Server folders can't be removed or renamed over FTP */
  private resolveEntry(
    virtualPath: string,
    mustExist: boolean,
    level: AccessLevel,
  ): string {
    const { serverId, rel } = this.parse(virtualPath);
    if (!serverId || !rel) throw fsError("EPERM", "server root is fixed");
    return this.resolve(virtualPath, mustExist, level);
  }

  private run<T>(cb: Callback<T>, fn: () => T): void {
    let value: T;
    try {
      value = fn();
    } catch (err) {
      process.nextTick(() => cb(err as NodeJS.ErrnoException));
      return;
    }
    process.nextTick(() => cb(null, value));
  }

  stat = (path: string, cb: Callback<fs.Stats>): void => {
    let full: string;
    try {
      const { serverId } = this.parse(path);
      if (!serverId) {
        this.user();
        return this.run(cb, rootStats);
      }
      full = this.resolve(path);
    } catch (err) {
      return fail(cb, err);
    }
    fs.stat(full, cb);
  };

  readdir = (path: string, cb: Callback<string[]>): void => {
    let full: string;
    let base: string;
    try {
      const { serverId } = this.parse(path);
      if (!serverId) {
        return this.run(cb, () =>
          this.allowedServerIds().filter((id) => {
            try {
              this.serverBase(id);
              return true;
            } catch {
              return false;
            }
          }),
        );
      }
      full = this.resolve(path);
      base = this.serverBase(serverId);
    } catch (err) {
      return fail(cb, err);
    }
    fs.readdir(full, (err, names) => {
      if (err) return cb(err);
      // Hide links that point outside, ftpd stats every entry
      cb(
        null,
        names.filter((name) => {
          try {
            return isInside(base, fs.realpathSync(`${full}${sep}${name}`));
          } catch {
            return false;
          }
        }),
      );
    });
  };

  open = (path: string, flags: string, cb: Callback<number>): void => {
    if (flags !== "r") {
      return fail(cb, fsError("EACCES", "only reads are opened by fd"));
    }
    let full: string;
    try {
      full = this.resolve(path);
    } catch (err) {
      return fail(cb, err);
    }
    fs.open(full, "r", cb);
  };

  // ftpd only reads from fds we opened above
  createReadStream = (
    path: string | null,
    options?: { fd?: number },
  ): Readable => {
    if (path === null && typeof options?.fd === "number") {
      return fs.createReadStream("", { fd: options.fd });
    }
    return deniedStream(fsError("EACCES", "read by path is not allowed"));
  };

  createWriteStream = (
    path: string,
    options?: { flags?: string; mode?: number },
  ): Writable => {
    let full: string;
    try {
      full = this.resolveEntry(path, false, "write");
    } catch (err) {
      return deniedStream(err as NodeJS.ErrnoException);
    }
    return fs.createWriteStream(full, options);
  };

  unlink = (path: string, cb: Callback): void => {
    this.withEntry(path, true, "manage", cb, (full) => fs.unlink(full, cb));
  };

  mkdir = (path: string, mode: number | Callback, cb?: Callback): void => {
    const done = (typeof mode === "function" ? mode : cb) as Callback;
    this.withEntry(path, false, "write", done, (full) => fs.mkdir(full, done));
  };

  rmdir = (path: string, cb: Callback): void => {
    this.withEntry(path, true, "manage", cb, (full) => fs.rmdir(full, cb));
  };

  rename = (from: string, to: string, cb: Callback): void => {
    let src: string;
    let dst: string;
    try {
      // The link itself gets moved, so it can't point outside either
      src = this.resolveEntry(from, true, "write");
      dst = this.resolveEntry(to, false, "write");
    } catch (err) {
      return fail(cb, err);
    }
    fs.rename(src, dst, cb);
  };

  private withEntry(
    path: string,
    mustExist: boolean,
    level: AccessLevel,
    cb: Callback,
    action: (full: string) => void,
  ): void {
    let full: string;
    try {
      full = this.resolveEntry(path, mustExist, level);
    } catch (err) {
      return fail(cb, err);
    }
    action(full);
  }
}

function assertRealInside(
  base: string,
  full: string,
  mustExist: boolean,
): void {
  let probe = full;
  for (;;) {
    let real: string;
    try {
      real = fs.realpathSync(probe);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" || mustExist) {
        throw fsError(code ?? "ENOENT", "no such file or directory");
      }
      // Writing through a dangling link creates its target
      if (isSymlink(probe)) throw fsError("EACCES", "dangling symlink");
      const parent = dirname(probe);
      if (parent === probe) throw fsError("ENOENT", "no parent");
      probe = parent;
      continue;
    }
    if (!isInside(base, real)) {
      throw fsError("EACCES", "path leaves the server directory");
    }
    return;
  }
}

// ftpd expects callbacks to run asynchronously
function fail(cb: Callback<any>, err: unknown): void {
  process.nextTick(() => cb(err as NodeJS.ErrnoException));
}

function isSymlink(path: string): boolean {
  try {
    return fs.lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

// Fails right away, ftpd sends the error to the client
function deniedStream(err: NodeJS.ErrnoException): PassThrough {
  const stream = new PassThrough();
  process.nextTick(() => stream.destroy(err));
  return stream;
}
