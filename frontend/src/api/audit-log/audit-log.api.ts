import { authHttp, buildQueryString, type AuthHttpClient } from "@/shared/lib/http";
import type { AuditLogPage, AuditLogQuery, AuditRetention, AuditRetentionState } from "./audit-log.model";

export class AuditLogApi {
  constructor(private authHttp: AuthHttpClient) {}

  query = (params: AuditLogQuery = {}): Promise<AuditLogPage> => this.authHttp.get<AuditLogPage>(`audit-logs${buildQueryString(params)}`);

  getRetention = (): Promise<AuditRetentionState> => this.authHttp.get<AuditRetentionState>("audit-logs/retention");

  setRetention = (retention: AuditRetention): Promise<AuditRetention> => this.authHttp.put<AuditRetention>("audit-logs/retention", { json: retention });

  previewRetention = (retention: AuditRetention): Promise<{ removed: number }> =>
    this.authHttp.post<{ removed: number }>("audit-logs/retention/preview", { json: retention });
}

export const auditLogApi = new AuditLogApi(authHttp);
