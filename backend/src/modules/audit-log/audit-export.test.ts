import { describe, expect, test } from "bun:test";
import { AuditResult, type IAuditLog } from "@shared/types/audit.types";
import { auditCsvRow, auditExportFileName } from "./audit-export";

const entry: IAuditLog = {
  id: "1",
  userId: "u1",
  username: '=HYPERLINK("x")',
  action: "server.start",
  category: "server" as IAuditLog["category"],
  resourceName: "Lobby, main",
  details: { note: "a\nb" },
  result: AuditResult.SUCCESS,
  source: "panel",
  createdAt: Date.UTC(2026, 10, 20, 12),
};

describe("audit export", () => {
  test("csv rows quote, escape and defuse formulas", () => {
    const row = auditCsvRow(entry);
    expect(
      row.startsWith(
        '2026-11-20T12:00:00.000Z,"\'=HYPERLINK(""x"")",server.start,server,success',
      ),
    ).toBe(true);
    expect(row).toContain('"Lobby, main"');
    expect(row).toContain('"{""note"":""a\\nb""}"');
  });

  test("file name has the date and format", () => {
    expect(auditExportFileName("csv", new Date(Date.UTC(2026, 10, 20)))).toBe(
      "kubek-audit-2026-11-20.csv",
    );
  });
});
