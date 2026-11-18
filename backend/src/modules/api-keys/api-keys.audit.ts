import { diffChanges } from "@/modules/audit-log/audit-diff";
import type { ApiKeyView } from "@shared/types/api-key.types";
import type { AuditChange } from "@shared/types/audit.types";

const snapshot = (
  key: Pick<ApiKeyView, "name" | "grants" | "servers" | "mcp">,
) => ({
  name: key.name,
  grants: key.grants,
  servers: key.servers,
  mcp: key.mcp,
});

export function keyChanges(
  before: ApiKeyView,
  after: ApiKeyView,
): AuditChange[] {
  return diffChanges(snapshot(before), snapshot(after));
}

/** What a new key can do, the token never goes to the log */
export function keySummary(key: ApiKeyView): Record<string, unknown> {
  return {
    prefix: key.prefix,
    grants: key.grants,
    servers: key.servers,
    mcp: key.mcp,
    expiresAt: key.expiresAt,
  };
}
