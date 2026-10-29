import { PropertiesDocument } from "@/core/properties/properties-document";
import type {
  ForwardingMode,
  NetworkFileChange,
  VelocitySettings,
} from "@shared/types/network.types";
import {
  configureVelocity,
  FORWARDING_SECRET_FILE,
  VELOCITY_CONFIG,
  velocityTemplate,
} from "../config/velocity-configurator";
import {
  type BackendForwarding,
  editOf,
  type FileEdit,
  type ServerFiles,
} from "../forwarding/backend-forwarding";
import { lineDiff } from "./line-diff";
import { maskSecret } from "./network-naming";

/** A server as the network sees it, serverId is null until the wizard creates it */
export interface DraftServer {
  serverId: string | null;
  name: string;
  blueprintId: string;
  gameVersion?: string;
  port: number;
  running: boolean;
}

export interface DraftProxy extends DraftServer {
  docker: boolean;
}

export interface DraftBackend extends DraftServer {
  alias: string;
  tryOrder: number | null;
  forwarding: BackendForwarding;
}

/** Desired state of a whole network */
export interface NetworkDraft {
  proxy: DraftProxy;
  backends: DraftBackend[];
  mode: ForwardingMode;
  secret: string;
  /** velocity.toml values from the wizard, absent for stored networks */
  settings?: Partial<VelocitySettings>;
}

export interface ServerEdits {
  server: DraftServer;
  edits: FileEdit[];
}

export type FilesOf = (server: DraftServer) => ServerFiles;

// A proxy in a container reaches the published backend ports through the host
export function backendAddress(
  proxy: DraftProxy,
  backend: Pick<DraftServer, "port">,
): string {
  const host = proxy.docker ? "host.docker.internal" : "127.0.0.1";
  return `${host}:${backend.port}`;
}

export async function proxyEdits(
  draft: NetworkDraft,
  files: ServerFiles,
): Promise<FileEdit[]> {
  const before = await files.read(VELOCITY_CONFIG);
  const tryList = draft.backends
    .filter((b) => b.tryOrder !== null)
    .sort((a, b) => a.tryOrder! - b.tryOrder!)
    .map((b) => b.alias);
  const after = configureVelocity(
    before ?? velocityTemplate(draft.proxy.port, draft.proxy.gameVersion),
    {
      mode: draft.mode,
      servers: draft.backends.map((b) => ({
        alias: b.alias,
        address: backendAddress(draft.proxy, b),
      })),
      tryList,
      settings: draft.settings,
    },
  );

  const secretBefore = await files.read(FORWARDING_SECRET_FILE);
  return [
    ...editOf(VELOCITY_CONFIG, before, after),
    ...(secretBefore?.trim() === draft.secret
      ? []
      : editOf(FORWARDING_SECRET_FILE, secretBefore, draft.secret)),
  ];
}

export async function backendEdits(
  draft: NetworkDraft,
  backend: DraftBackend,
  files: ServerFiles,
): Promise<FileEdit[]> {
  const forwarding = await backend.forwarding.edits(files, {
    mode: draft.mode,
    secret: draft.secret,
    gameVersion: backend.gameVersion,
  });
  // The install of a new server writes its own server.properties
  if (!backend.serverId) return forwarding;

  const properties = await files.read("server.properties");
  const doc = PropertiesDocument.parse(properties ?? "");
  doc.set("online-mode", "false");
  // Docker installs leave no file and the image keeps one it finds, so a
  // fresh file has to carry the port too
  if (properties === null && backend.port) {
    doc.set("server-port", String(backend.port));
  }
  return [
    ...editOf("server.properties", properties, doc.toString()),
    ...forwarding,
  ];
}

/** Edits of the proxy and of the listed backends */
export async function draftEdits(
  draft: NetworkDraft,
  configure: DraftBackend[],
  filesOf: FilesOf,
): Promise<ServerEdits[]> {
  const out: ServerEdits[] = [
    {
      server: draft.proxy,
      edits: await proxyEdits(draft, filesOf(draft.proxy)),
    },
  ];
  for (const backend of configure) {
    out.push({
      server: backend,
      edits: await backendEdits(draft, backend, filesOf(backend)),
    });
  }
  return out.filter((entry) => entry.edits.length > 0);
}

/** File changes for the review step, the secret never shows up in them */
export function fileChanges(
  edits: ServerEdits[],
  secret: string,
): NetworkFileChange[] {
  return edits.flatMap(({ server, edits: list }) =>
    list.map((edit) => ({
      serverId: server.serverId,
      serverName: server.name,
      path: edit.path,
      kind: edit.before === null ? ("create" as const) : ("update" as const),
      diff: lineDiff(
        maskSecret(edit.before ?? "", secret),
        maskSecret(edit.after, secret),
      ),
    })),
  );
}

/** Running servers whose files change */
export function needsRestart(edits: ServerEdits[]): string[] {
  return edits
    .filter(({ server }) => server.serverId && server.running)
    .map(({ server }) => server.serverId!);
}
