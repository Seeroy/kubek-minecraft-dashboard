import type { AuditRecordInput, AuditSource } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";

type PrincipalFields = Pick<
  AuditRecordInput,
  "source" | "apiKeyId" | "apiKeyName"
>;

/** Marks entries made with an API key, others keep the given source */
export function auditPrincipal(
  user: Pick<IUser, "apiKey"> | null | undefined,
  fallback: AuditSource = "panel",
): PrincipalFields {
  const key = user?.apiKey;
  if (!key) return { source: fallback };
  return { source: "api", apiKeyId: key.id, apiKeyName: key.name };
}
