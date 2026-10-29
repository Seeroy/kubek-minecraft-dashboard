import type { IConfiguration } from "@/core/types/config";
import { diffChanges } from "@/modules/audit-log/audit-diff";
import type { AuditResolved } from "@/modules/audit-log/audit.decorator";
import { AuditAction } from "@shared/types/audit.types";
import { INTERNAL_KEYS, SECRET_PATHS } from "./config-view";

const IGNORED = [...INTERNAL_KEYS, "secrets", "configVersion"];

/** Settings diff, toggling the embedded FTP service is recorded as its own action */
export function configAudit(
  before: IConfiguration,
  after: IConfiguration,
): AuditResolved {
  const changes = diffChanges(before, after, {
    secrets: SECRET_PATHS,
    ignore: IGNORED,
  });
  const ftp = changes.find((change) => change.field === "ftpd.enabled");
  if (!ftp) return { changes };
  return {
    action: ftp.to ? AuditAction.FTP_ENABLE : AuditAction.FTP_DISABLE,
    resourceType: "ftp",
    changes,
  };
}
