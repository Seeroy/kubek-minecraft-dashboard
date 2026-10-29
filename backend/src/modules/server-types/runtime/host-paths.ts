import fs from "fs";
import path from "path";

/** Mount of our container from docker inspect */
export interface PanelMount {
  Source: string;
  Destination: string;
}

const WIN_PATH_RE = /^[A-Za-z]:[\\/]/;

/** local is base or inside it */
function isUnder(local: string, base: string): boolean {
  const b = base.endsWith("/") && base.length > 1 ? base.slice(0, -1) : base;
  return local === b || local.startsWith(b === "/" ? "/" : b + "/");
}

/** Join a posix path onto a host dir, which can be a Windows path */
function joinHost(hostDir: string, rel: string): string {
  if (!rel) return hostDir;
  if (WIN_PATH_RE.test(hostDir)) {
    return path.win32.join(hostDir, ...rel.split("/"));
  }
  return path.posix.join(hostDir, rel);
}

/**
 * Host path through KUBEK_HOST_DATA_DIR (host folder of the panel working dir)
 * Null if the path is outside the working dir
 */
export function mapByHostDataDir(
  localPath: string,
  cwd: string,
  hostDataDir: string,
): string | null {
  const local = path.posix.normalize(localPath);
  const base = path.posix.normalize(cwd);
  if (!isUnder(local, base)) return null;
  return joinHost(hostDataDir, path.posix.relative(base, local));
}

/**
 * Host path through our container mounts, the deepest one wins
 * Null if no mount covers it
 */
export function mapByMounts(
  localPath: string,
  mounts: PanelMount[],
): string | null {
  const local = path.posix.normalize(localPath);
  let best: PanelMount | undefined;
  for (const mount of mounts) {
    if (!mount.Source || !mount.Destination) continue;
    const dest = path.posix.normalize(mount.Destination);
    if (!isUnder(local, dest)) continue;
    if (!best || dest.length > path.posix.normalize(best.Destination).length) {
      best = mount;
    }
  }
  if (!best) return null;
  const rel = path.posix.relative(
    path.posix.normalize(best.Destination),
    local,
  );
  return joinHost(best.Source, rel);
}

/**
 * Our container id from /proc/self/mountinfo, taken from the /etc/hostname mount
 * Only that one counts, the host sees containers/<id> paths too
 */
export function containerIdFromMountinfo(mountinfo: string): string | null {
  for (const line of mountinfo.split("\n")) {
    const fields = line.split(" ");
    if (fields[4] !== "/etc/hostname") continue;
    const match = /\/containers\/([0-9a-f]{64})\//.exec(fields[3] ?? "");
    if (match) return match[1];
  }
  return null;
}

/** Our container id read from this process mountinfo */
export function ownContainerId(): string | null {
  try {
    return containerIdFromMountinfo(
      fs.readFileSync("/proc/self/mountinfo", "utf8"),
    );
  } catch {
    return null;
  }
}

/** Panel runs inside a Docker or Podman container */
export function isInsideContainer(): boolean {
  if (process.platform !== "linux") return false;
  if (fs.existsSync("/.dockerenv") || fs.existsSync("/run/.containerenv")) {
    return true;
  }
  return ownContainerId() !== null;
}
