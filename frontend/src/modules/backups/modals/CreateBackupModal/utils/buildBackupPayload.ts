import type { CreateBackupRequest } from "@/api";
import type { CreateBackupFormValues } from "../validations/schema";

/**
 * Shapes the form values into the backend CreateBackupDto
 */
export function buildBackupPayload(
  values: CreateBackupFormValues,
  serverId: string
): CreateBackupRequest {
  return {
    ...values,
    serverId,
    selectedFiles:
      values.type === "partial" && values.selectionMode === "custom"
        ? (values.selectedFiles || []).map((path) => ({
            name: path.split("/").pop() || path,
            path,
          }))
        : undefined,
  };
}
