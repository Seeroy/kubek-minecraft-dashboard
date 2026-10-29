import type { SecretHint } from "./secret.types";
import type { ServerStatus } from "./server/server.types";

export type ForwardingMode = "modern" | "legacy";

/** How a backend type takes player info from the proxy */
export type BackendForwardingKind = "paper" | "fabric" | "spigot";

export enum NetworkErrorCode {
  NOT_FOUND = "NETWORK_NOT_FOUND",
  /** The proxy is not a Velocity server */
  PROXY_INVALID = "NETWORK_PROXY_INVALID",
  /** The server already is a proxy or a member of a network */
  SERVER_TAKEN = "NETWORK_SERVER_TAKEN",
  /** The server type cannot sit behind Velocity */
  BACKEND_UNSUPPORTED = "NETWORK_BACKEND_UNSUPPORTED",
  /** No forwarding mode fits every backend */
  MODE_CONFLICT = "NETWORK_MODE_CONFLICT",
  NO_FREE_PORT = "NETWORK_NO_FREE_PORT",
  /** Try order names a server that is not in the network */
  ORDER_INVALID = "NETWORK_ORDER_INVALID",
  /** A new server would reuse the name of another one */
  NAME_TAKEN = "NETWORK_NAME_TAKEN",
  /** A chosen port is used by another server */
  PORT_TAKEN = "NETWORK_PORT_TAKEN",
}

export interface NetworkServerRef {
  serverId: string;
  name: string;
  blueprintId: string;
  status: ServerStatus;
}

export interface NetworkMember extends NetworkServerRef {
  alias: string;
  /** Position in the try list, null when players are never sent there first */
  tryOrder: number | null;
  /** Address the proxy connects to */
  address: string;
}

export interface Network {
  id: string;
  name: string;
  forwardingMode: ForwardingMode;
  createdAt: number;
  proxy: NetworkServerRef;
  members: NetworkMember[];
  /** forwarding.secret of the proxy, the value never leaves the panel */
  secret: SecretHint;
}

export interface NetworkBackendCandidate extends NetworkServerRef {
  kind: BackendForwardingKind;
  modes: ForwardingMode[];
}

/** velocity.toml values the wizard can change */
export interface VelocitySettings {
  motd: string;
  showMaxPlayers: number;
  onlineMode: boolean;
  forceKeyAuthentication: boolean;
  preventClientProxyConnections: boolean;
  kickExistingPlayers: boolean;
  announceForge: boolean;
  compressionThreshold: number;
  loginRatelimit: number;
  connectionTimeout: number;
  readTimeout: number;
  haproxyProtocol: boolean;
  failoverOnUnexpectedServerDisconnect: boolean;
  logPlayerConnections: boolean;
  acceptsTransfers: boolean;
  queryEnabled: boolean;
}

export interface NetworkProxyCandidate extends NetworkServerRef {
  /** Current velocity.toml values, defaults where the file has none */
  settings: VelocitySettings;
}

/** Servers the wizard can use and backend types it can create */
export interface NetworkCandidates {
  proxies: NetworkProxyCandidate[];
  backends: NetworkBackendCandidate[];
  creatable: { blueprintId: string; kind: BackendForwardingKind }[];
  /** Values a new proxy starts with */
  velocityDefaults: VelocitySettings;
}

/** A server the wizard creates, port is picked when omitted */
export interface NewServerOptions {
  name: string;
  version: string;
  port?: number;
  memory?: number;
  runtime?: "native" | "docker";
  jvmArgs?: string;
}

export type NewProxyProps = NewServerOptions;

export interface NewBackendProps extends NewServerOptions {
  blueprintId: string;
}

/** Prefix of try order refs that point at a server the wizard creates */
export const NEW_BACKEND_REF = "new:";

export interface NetworkWizardProps {
  name: string;
  /** An existing Velocity server, or newProxy */
  proxyServerId?: string;
  newProxy?: NewProxyProps;
  backendIds: string[];
  newBackends?: NewBackendProps[];
  /** Detected from the backends when omitted */
  forwardingMode?: ForwardingMode;
  /** Server ids or "new:<index>", the first one is the default server */
  tryOrder: string[];
  /** velocity.toml values to write, others stay as they are */
  proxySettings?: Partial<VelocitySettings>;
}

export type DiffLine =
  { op: "same" | "add" | "del"; text: string } | { op: "skip"; count: number };

export interface NetworkFileChange {
  /** Null for a server the wizard is going to create */
  serverId: string | null;
  serverName: string;
  path: string;
  kind: "create" | "update";
  diff: DiffLine[];
}

export type NetworkPlanNote =
  | {
      code: "new_server";
      serverName: string;
      blueprintId: string;
      port: number;
    }
  | { code: "install_fabric_proxy"; serverName: string }
  | { code: "legacy_forced"; serverNames: string[] }
  | { code: "legacy_insecure" };

export interface NetworkPlan {
  forwardingMode: ForwardingMode;
  changes: NetworkFileChange[];
  notes: NetworkPlanNote[];
  /** Running servers that pick the changes up only after a restart */
  restart: string[];
}

export interface NetworkChangeResult {
  networkId: string;
  restart: string[];
}
