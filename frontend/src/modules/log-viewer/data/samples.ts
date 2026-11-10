import type { ILogFile } from "../types";

const file = (name: string, gzipped: boolean): ILogFile => ({ name, path: `logs/${name}`, size: 48_000, modify: "2026-01-01T00:00:00Z", gzipped });

export const SAMPLE_LOG_GROUPS: { key: string; items: ILogFile[] }[] = [
  { key: "current", items: [file("latest.log", false)] },
  { key: "archive", items: [file("2026-01-01-1.log.gz", true), file("2026-01-01-2.log.gz", true), file("2025-12-31-1.log.gz", true)] },
];
