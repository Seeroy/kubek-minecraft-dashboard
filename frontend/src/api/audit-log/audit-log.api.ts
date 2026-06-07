import {
  authHttp,
  buildQueryString,
  type AuthHttpClient,
} from "@/shared/lib/http";
import type { AuditLogPage, AuditLogQuery } from "./audit-log.model";

export class AuditLogApi {
  constructor(private authHttp: AuthHttpClient) {}

  query = (params: AuditLogQuery = {}): Promise<AuditLogPage> =>
    this.authHttp.get<AuditLogPage>(`audit-logs${buildQueryString(params)}`);
}

export const auditLogApi = new AuditLogApi(authHttp);
