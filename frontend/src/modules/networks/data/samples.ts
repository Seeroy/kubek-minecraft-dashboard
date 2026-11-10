import type { Network, NetworkPlan } from "@/api";
import { ServerStatus } from "@shared/types/server/server.types";

const member = (i: number, name: string, tryOrder: number | null): Network["members"][number] => ({
  serverId: `sample-${i}`,
  name,
  blueprintId: "paper",
  status: ServerStatus.RUNNING,
  alias: name.toLowerCase(),
  tryOrder,
  address: `127.0.0.1:2556${i}`,
});

export const SAMPLE_NETWORK: Network = {
  id: "sample",
  name: "Main network",
  forwardingMode: "modern",
  createdAt: 0,
  proxy: { serverId: "sample-proxy", name: "Proxy", blueprintId: "velocity", status: ServerStatus.RUNNING },
  members: [member(1, "Lobby", 0), member(2, "Survival", 1), member(3, "Creative", null)],
  secret: { set: true, hint: null },
};

export const SAMPLE_PLAN: NetworkPlan = {
  forwardingMode: "modern",
  notes: [{ code: "new_server", serverName: "Lobby", blueprintId: "paper", port: 25566 }],
  changes: [
    { serverId: "sample-proxy", serverName: "Proxy", path: "velocity.toml", kind: "update", diff: [{ op: "same", text: "bind = \"0.0.0.0:25565\"" }, { op: "add", text: "player-info-forwarding-mode = \"modern\"" }] },
    { serverId: "sample-1", serverName: "Survival", path: "config/paper-global.yml", kind: "update", diff: [] },
  ],
  restart: [],
};

export const SAMPLE_VERSIONS = ["1.21.4", "1.21.3", "1.20.6"];
