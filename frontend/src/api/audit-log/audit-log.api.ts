import { authHttp, buildQueryString, type AuthHttpClient } from "@/shared/lib/http";
import type { AuditExportFormat, AuditLogPage, AuditLogQuery, AuditRetention, AuditRetentionState } from "./audit-log.model";

export class AuditLogApi {
  constructor(private authHttp: AuthHttpClient) {}

  query = (params: AuditLogQuery = {}): Promise<AuditLogPage> => this.authHttp.get<AuditLogPage>(`audit-logs${buildQueryString(params)}`);

  /** Every entry matching the filters as a file, limit and offset are ignored */
  export = async (filters: AuditLogQuery, format: AuditExportFormat): Promise<{ blob: Blob; filename: string }> => {
    const response = await this.authHttp.raw.get(`audit-logs/export${buildQueryString({ ...filters, limit: undefined, offset: undefined, format })}`, {
      timeout: false,
    });
    const match = (response.headers.get("content-disposition") ?? "").match(/filename="?([^";]+)"?/i);
    return { blob: await response.blob(), filename: match?.[1] ?? `kubek-audit.${format}` };
  };

  getRetention = (): Promise<AuditRetentionState> => this.authHttp.get<AuditRetentionState>("audit-logs/retention");

  setRetention = (retention: AuditRetention): Promise<AuditRetention> => this.authHttp.put<AuditRetention>("audit-logs/retention", { json: retention });

  previewRetention = (retention: AuditRetention): Promise<{ removed: number }> =>
    this.authHttp.post<{ removed: number }>("audit-logs/retention/preview", { json: retention });
}

export const auditLogApi = new AuditLogApi(authHttp);
