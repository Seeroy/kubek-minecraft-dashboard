import path from "path";

export const LABEL_MANAGED = "kubek.managed";
export const LABEL_SERVER = "kubek.server";
export const LABEL_PANEL = "kubek.panel";
/** Host data folder as we wrote it, mounts can show it differently */
export const LABEL_DIR = "kubek.dir";

/** Fixed container name, so the panel finds it after a restart */
export function containerNameFor(serverId: string): string {
  return `kubek-${serverId}`;
}

/** Labels every server container is created with */
export function containerLabels(
  serverId: string,
  panelId: string,
  hostDir?: string,
): Record<string, string> {
  return {
    [LABEL_MANAGED]: "true",
    [LABEL_SERVER]: serverId,
    [LABEL_PANEL]: panelId,
    ...(hostDir ? { [LABEL_DIR]: hostDir } : {}),
  };
}

/** What we need from a listContainers row */
export interface ContainerRow {
  id: string;
  /** docker reports names with a leading slash */
  names: string[];
  /** running, exited, created, paused, restarting, dead */
  state: string;
  labels: Record<string, string>;
  mounts: { Source?: string; Destination?: string }[];
}

export type ReconcileAction =
  | { kind: "adopt"; serverId: string; containerId: string }
  | { kind: "remove"; serverId: string; containerId: string }
  | { kind: "skip"; serverId: string; containerId: string; reason: string };

function samePath(a: string, b: string): boolean {
  const norm = (p: string) => path.posix.normalize(p).replace(/\/+$/, "");
  return norm(a) === norm(b);
}

/**
 * What to do with leftover containers on boot. Ours means our panel label or
 * an old unlabeled kubek-<id> of a known server, and its data folder has to be
 * ours too, so a copy of the panel never touches the original's containers
 * Running ones get adopted, stopped ones removed, the rest is left alone
 *
 * @param serverDirs host path of the data folder for every known server
 */
export function reconcileContainers(
  rows: ContainerRow[],
  panelId: string,
  serverDirs: Map<string, string>,
): ReconcileAction[] {
  const actions: ReconcileAction[] = [];
  for (const row of rows) {
    const serverId = ownerOf(row, panelId, serverDirs);
    if (!serverId) continue;
    const base = { serverId, containerId: row.id };

    const dir = serverDirs.get(serverId);
    if (!dir) {
      // Ours but the server is gone, a stopped one is just garbage
      if (row.state === "running") {
        actions.push({ ...base, kind: "skip", reason: "server not found" });
      } else {
        actions.push({ ...base, kind: "remove" });
      }
      continue;
    }

    const labeledDir = row.labels?.[LABEL_DIR];
    const ownDir = labeledDir
      ? samePath(labeledDir, dir)
      : row.mounts.some((m) => !!m.Source && samePath(m.Source, dir));
    if (!ownDir) {
      actions.push({
        ...base,
        kind: "skip",
        reason: "data mount points elsewhere",
      });
      continue;
    }

    if (row.state === "running") {
      actions.push({ ...base, kind: "adopt" });
    } else if (row.state === "paused" || row.state === "restarting") {
      actions.push({ ...base, kind: "skip", reason: `state ${row.state}` });
    } else {
      actions.push({ ...base, kind: "remove" });
    }
  }
  return actions;
}

/** Server id of the container, null if it's not ours */
function ownerOf(
  row: ContainerRow,
  panelId: string,
  serverDirs: Map<string, string>,
): string | null {
  const labels = row.labels ?? {};
  if (labels[LABEL_MANAGED] !== undefined) {
    if (labels[LABEL_MANAGED] !== "true") return null;
    if (labels[LABEL_PANEL] !== panelId) return null;
    const serverId = labels[LABEL_SERVER];
    if (!serverId) return null;
    // Wrong name means someone else made it
    if (!row.names.includes(`/${containerNameFor(serverId)}`)) return null;
    return serverId;
  }
  // Older panels made containers without labels
  for (const name of row.names) {
    const match = /^\/kubek-(.+)$/.exec(name);
    if (match && serverDirs.has(match[1])) return match[1];
  }
  return null;
}
