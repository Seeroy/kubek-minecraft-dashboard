import type { IServer } from "@shared/types/server/server.types";

/**
 * Payload of kubek-manifest.json embedded in every server export archive
 */
export interface ExportManifest {
  kubekExport: number;
  exportedAt: string;
  server: {
    name: string;
    restartOnError: IServer["restartOnError"];
    blueprintId: string;
    blueprintVersion?: string;
    runtimeKind?: IServer["runtimeKind"];
    variables: IServer["variables"];
  };
}

/**
 * Result of preparing an export archive on disk
 */
export interface ExportArtifact {
  archivePath: string;
  suggestedName: string;
  cleanup: () => void;
}

/**
 * Summary returned by bulk-delete: per-id outcome so the UI can show
 * "deleted N, failed M" without losing detail on the rejected ones
 */
export interface BulkDeleteResult {
  deleted: string[];
  failed: { id: string; reason: string }[];
}
