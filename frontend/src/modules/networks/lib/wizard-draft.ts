import { NEW_BACKEND_REF, type ForwardingMode, type NetworkCandidates, type NetworkWizardProps, type VelocitySettings } from "@/api";

export const WIZARD_STEPS = ["proxy", "backends", "velocity", "options", "review", "apply"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const DEFAULT_MEMORY = 2048;
export const DEFAULT_PROXY_MEMORY = 512;
export const MAX_NEW_BACKENDS = 10;
export const MIN_MEMORY = 512;
export const MIN_PROXY_MEMORY = 256;
export const PROXY_PORT = 25577;

const SUGGESTED_NAMES = ["lobby", "survival", "creative", "minigames"];

/** A server the wizard creates, every field is its own */
export interface NewServerDraft {
  /** Stable id for React keys and the try order */
  key: string;
  name: string;
  blueprintId: string;
  version: string;
  /** Empty means the panel picks a free one */
  port: string;
  memory: number;
  aikar: boolean;
  docker: boolean;
}

export interface WizardDraft {
  name: string;
  proxyMode: "new" | "existing";
  proxyName: string;
  proxyVersion: string;
  proxyPort: string;
  proxyMemory: number;
  proxyDocker: boolean;
  proxyServerId: string;
  backendIds: string[];
  newServers: NewServerDraft[];
  mode: "auto" | ForwardingMode;
  /** Server ids and "new:<key>" refs, the first is the default */
  order: string[];
  /** Refs left out of the try list */
  excluded: string[];
  /** velocity.toml values the user touched, the rest stays as it is */
  velocity: Partial<VelocitySettings>;
}

export function initialDraft(proxyServerId?: string): WizardDraft {
  return {
    name: "",
    proxyMode: proxyServerId ? "existing" : "new",
    proxyName: "proxy",
    proxyVersion: "",
    proxyPort: "",
    proxyMemory: DEFAULT_PROXY_MEMORY,
    proxyDocker: false,
    proxyServerId: proxyServerId ?? "",
    backendIds: [],
    newServers: [],
    mode: "auto",
    order: [],
    excluded: [],
    velocity: {},
  };
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The name itself when free, otherwise the first free "<base>-<n>" */
export function uniqueName(name: string, taken: string[]): string {
  const isTaken = (candidate: string) => taken.some((other) => sameName(other, candidate));
  if (!isTaken(name)) return name;
  const base = name.replace(/-\d+$/, "");
  for (let i = 2; ; i++) if (!isTaken(`${base}-${i}`)) return `${base}-${i}`;
}

/** Names of the servers the wizard is about to create */
export function newNames(draft: WizardDraft): string[] {
  return [...(draft.proxyMode === "new" ? [draft.proxyName] : []), ...draft.newServers.map((s) => s.name)];
}

export function suggestName(draft: WizardDraft, panelNames: string[]): string {
  const taken = [...panelNames, ...newNames(draft)];
  return SUGGESTED_NAMES.find((name) => !taken.some((other) => sameName(other, name))) ?? uniqueName("server", taken);
}

let keySeq = 0;
export const newServerKey = () => `s${Date.now().toString(36)}${(keySeq++).toString(36)}`;

export const newRef = (server: NewServerDraft) => `${NEW_BACKEND_REF}${server.key}`;

/** Every backend ref in display order, kept in sync with the current choice */
export function orderedRefs(draft: WizardDraft): string[] {
  const all = [...draft.backendIds, ...draft.newServers.map(newRef)];
  const kept = draft.order.filter((ref) => all.includes(ref));
  return [...kept, ...all.filter((ref) => !kept.includes(ref))];
}

/** Forwarding modes every chosen backend supports */
export function sharedModes(draft: WizardDraft, candidates: NetworkCandidates | undefined): ForwardingMode[] {
  const lists: ForwardingMode[][] = draft.backendIds.map((id) => candidates?.backends.find((b) => b.serverId === id)?.modes ?? []);
  for (const server of draft.newServers) {
    const kind = candidates?.creatable.find((c) => c.blueprintId === server.blueprintId)?.kind;
    // Mirrors the backend strategies, the review step has the final word
    lists.push(kind === "fabric" ? ["modern"] : kind === "spigot" ? ["legacy"] : ["modern", "legacy"]);
  }
  return (["modern", "legacy"] as const).filter((mode) => lists.every((list) => list.includes(mode)));
}

export type NameIssue = "empty" | "taken" | "duplicate";
export type PortIssue = "invalid" | "taken" | "duplicate";

/** What the panel already holds, for checks before the backend sees the draft */
export interface PanelState {
  names: string[];
  /** Port to the name of the server that uses it */
  ports: Map<number, string>;
}

/** Problems keyed by "proxy" or a new server key */
export function nameIssues(draft: WizardDraft, panel: PanelState): Map<string, NameIssue> {
  const entries: [string, string][] = [
    ...(draft.proxyMode === "new" ? [["proxy", draft.proxyName] as [string, string]] : []),
    ...draft.newServers.map((s): [string, string] => [s.key, s.name]),
  ];
  const issues = new Map<string, NameIssue>();
  entries.forEach(([key, name], index) => {
    if (!name.trim()) issues.set(key, "empty");
    else if (panel.names.some((other) => sameName(other, name))) issues.set(key, "taken");
    else if (entries.some(([, other], i) => i < index && sameName(other, name))) issues.set(key, "duplicate");
  });
  return issues;
}

export const parsePort = (value: string) => (value.trim() ? Number(value) : null);

export function portIssues(draft: WizardDraft, panel: PanelState): Map<string, PortIssue> {
  const entries: [string, string][] = [
    ...(draft.proxyMode === "new" ? [["proxy", draft.proxyPort] as [string, string]] : []),
    ...draft.newServers.map((s): [string, string] => [s.key, s.port]),
  ];
  const issues = new Map<string, PortIssue>();
  entries.forEach(([key, raw], index) => {
    const port = parsePort(raw);
    if (port === null) return;
    if (!Number.isInteger(port) || port < 1 || port > 65535) issues.set(key, "invalid");
    else if (panel.ports.has(port)) issues.set(key, "taken");
    else if (entries.some(([, other], i) => i < index && parsePort(other) === port)) issues.set(key, "duplicate");
  });
  return issues;
}

export function stepValid(step: WizardStep, draft: WizardDraft, panel: PanelState): boolean {
  const names = nameIssues(draft, panel);
  const ports = portIssues(draft, panel);
  switch (step) {
    case "proxy":
      if (!draft.name.trim()) return false;
      if (draft.proxyMode === "existing") return !!draft.proxyServerId;
      return !names.has("proxy") && !ports.has("proxy") && !!draft.proxyVersion && draft.proxyMemory >= MIN_PROXY_MEMORY;
    case "backends":
      if (!draft.backendIds.length && !draft.newServers.length) return false;
      return draft.newServers.every((s) => !names.has(s.key) && !ports.has(s.key) && !!s.version && s.memory >= MIN_MEMORY);
    default:
      return true;
  }
}

export function toWizardProps(draft: WizardDraft, aikarArgs: (memory: number) => string): NetworkWizardProps {
  const port = (raw: string) => parsePort(raw) ?? undefined;
  const runtime = (docker: boolean) => (docker ? ("docker" as const) : undefined);
  // Backend refs of new servers are positions in the list
  const refOf = (ref: string) => {
    const index = draft.newServers.findIndex((s) => newRef(s) === ref);
    return index < 0 ? ref : `${NEW_BACKEND_REF}${index}`;
  };

  return {
    name: draft.name.trim(),
    ...(draft.proxyMode === "existing"
      ? { proxyServerId: draft.proxyServerId }
      : {
          newProxy: {
            name: draft.proxyName.trim(),
            version: draft.proxyVersion,
            port: port(draft.proxyPort),
            memory: draft.proxyMemory,
            runtime: runtime(draft.proxyDocker),
          },
        }),
    backendIds: draft.backendIds,
    ...(draft.newServers.length > 0 && {
      newBackends: draft.newServers.map((s) => ({
        name: s.name.trim(),
        blueprintId: s.blueprintId,
        version: s.version,
        port: port(s.port),
        memory: s.memory,
        runtime: runtime(s.docker),
        jvmArgs: s.aikar ? aikarArgs(s.memory) : undefined,
      })),
    }),
    ...(draft.mode !== "auto" && { forwardingMode: draft.mode }),
    tryOrder: orderedRefs(draft)
      .filter((ref) => !draft.excluded.includes(ref))
      .map(refOf),
    proxySettings: draft.velocity,
  };
}
