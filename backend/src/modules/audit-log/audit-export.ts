import type { IAuditLog } from "@shared/types/audit.types";
import type { Response } from "express";
import { once } from "node:events";

export const AUDIT_EXPORT_FORMATS = ["json", "csv"] as const;
export type AuditExportFormat = (typeof AUDIT_EXPORT_FORMATS)[number];

const CSV_COLUMNS = [
  "createdAt",
  "username",
  "action",
  "category",
  "result",
  "resourceType",
  "resourceId",
  "resourceName",
  "serverId",
  "serverName",
  "source",
  "apiKeyName",
  "ip",
  "userAgent",
  "error",
  "changes",
  "details",
] as const;

// Excel runs cells starting with these as formulas, usernames and names come from users
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(value: unknown): string {
  if (value == null) return "";
  // numbers and booleans print the same through JSON
  let text = typeof value === "string" ? value : JSON.stringify(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function auditCsvRow(entry: IAuditLog): string {
  return CSV_COLUMNS.map((column) =>
    csvCell(
      column === "createdAt"
        ? new Date(entry.createdAt).toISOString()
        : entry[column],
    ),
  ).join(",");
}

export function auditExportFileName(
  format: AuditExportFormat,
  now = new Date(),
) {
  return `kubek-audit-${now.toISOString().slice(0, 10)}.${format}`;
}

/** Streams entries into the response, waits for drain so a huge log never sits in memory */
export async function writeAuditExport(
  res: Response,
  entries: Iterable<IAuditLog>,
  format: AuditExportFormat,
): Promise<void> {
  res.setHeader(
    "Content-Type",
    format === "csv"
      ? "text/csv; charset=utf-8"
      : "application/json; charset=utf-8",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${auditExportFileName(format)}"`,
  );

  const write = async (chunk: string) => {
    if (!res.write(chunk)) await once(res, "drain");
  };

  // BOM so Excel opens cyrillic as UTF-8
  if (format === "csv") await write(`\uFEFF${CSV_COLUMNS.join(",")}\r\n`);
  else await write("[");

  let first = true;
  for (const entry of entries) {
    if (res.destroyed) return;
    if (format === "csv") await write(`${auditCsvRow(entry)}\r\n`);
    else await write(`${first ? "\n" : ",\n"}${JSON.stringify(entry)}`);
    first = false;
  }

  if (format === "json") await write(first ? "]\n" : "\n]\n");
  res.end();
}
