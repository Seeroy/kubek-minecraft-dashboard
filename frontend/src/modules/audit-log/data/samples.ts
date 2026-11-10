import type { AuditLogEntry, AuditRetentionState } from "@/api";

const entry = (i: number, action: string, resourceName: string): AuditLogEntry => ({
  id: `sample-${i}`,
  userId: "sample",
  username: "sample-admin",
  action,
  category: "server",
  resourceType: "server",
  resourceName,
  serverName: resourceName,
  result: "success",
  ip: "192.168.0.10",
  source: "panel",
  createdAt: 0,
});

export const SAMPLE_AUDIT: AuditLogEntry[] = [
  entry(1, "server.start", "Survival"),
  entry(2, "server.stop", "Creative"),
  entry(3, "server.restart", "Survival"),
  entry(4, "server.create", "Lobby"),
  entry(5, "server.start", "Lobby"),
  entry(6, "server.stop", "Survival"),
];

export const SAMPLE_RETENTION: AuditRetentionState = { retention: { keepDays: 90, maxEntries: 100_000 }, total: 12_400, oldestAt: 0 };
