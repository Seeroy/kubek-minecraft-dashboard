import { AuditResult } from "@shared/types/audit.types";

/** Fallback label for an action with no dedicated translation */
export function humanizeAction(action: string): string {
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Action value > flat i18n key */
export function actionLabelKey(action: string): string {
  return action.replace(/\./g, "_");
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

export function resultBadgeVariant(
  result: AuditResult | "success" | "failed"
): "success" | "destructive" {
  return result === AuditResult.SUCCESS ? "success" : "destructive";
}
