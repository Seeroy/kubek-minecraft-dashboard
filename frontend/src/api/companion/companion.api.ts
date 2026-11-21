import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  CompanionActivity,
  CompanionEventsPage,
  CompanionEventType,
  CompanionInstallResult,
  CompanionLagReport,
  CompanionMaintenance,
  CompanionMaintenanceRequest,
  CompanionMetricPoint,
  CompanionMetricsWindow,
  CompanionOverview,
  CompanionSettings,
  CompanionTitleRequest,
} from "./companion.model";

export interface CompanionEventsParams {
  types?: CompanionEventType[];
  before?: number;
  q?: string;
  limit?: number;
  uuid?: string;
}

/** Kubek Companion plugin: install state, live data and in game actions */
export class CompanionApi {
  constructor(private authHttp: AuthHttpClient) {}

  private base = (serverId: string) => `servers/${serverId}/companion`;

  getOverview = (serverId: string): Promise<CompanionOverview> => this.authHttp.get<CompanionOverview>(this.base(serverId));

  install = (serverId: string): Promise<CompanionInstallResult> => this.authHttp.post<CompanionInstallResult>(`${this.base(serverId)}/install`);

  updateSettings = (serverId: string, data: Partial<CompanionSettings>): Promise<CompanionSettings> =>
    this.authHttp.put<CompanionSettings>(`${this.base(serverId)}/settings`, { json: data });

  getMetrics = (serverId: string, window: CompanionMetricsWindow): Promise<CompanionMetricPoint[]> =>
    this.authHttp.get<CompanionMetricPoint[]>(`${this.base(serverId)}/metrics`, { searchParams: { window } });

  getLagReport = (serverId: string, limit = 10): Promise<CompanionLagReport> =>
    this.authHttp.get<CompanionLagReport>(`${this.base(serverId)}/lag-report`, { searchParams: { limit } });

  getEvents = (serverId: string, params: CompanionEventsParams = {}): Promise<CompanionEventsPage> => {
    const searchParams = new URLSearchParams();
    if (params.types?.length) searchParams.set("types", params.types.join(","));
    if (params.before) searchParams.set("before", String(params.before));
    if (params.q) searchParams.set("q", params.q);
    if (params.uuid) searchParams.set("uuid", params.uuid);
    if (params.limit) searchParams.set("limit", String(params.limit));
    return this.authHttp.get<CompanionEventsPage>(`${this.base(serverId)}/events`, { searchParams });
  };

  getActivity = (serverId: string, days = 7): Promise<CompanionActivity> =>
    this.authHttp.get<CompanionActivity>(`${this.base(serverId)}/activity`, { searchParams: { days } });

  broadcast = (serverId: string, message: string): Promise<void> => this.authHttp.post<void>(`${this.base(serverId)}/broadcast`, { json: { message } });

  title = (serverId: string, data: CompanionTitleRequest): Promise<void> => this.authHttp.post<void>(`${this.base(serverId)}/title`, { json: data });

  setMaintenance = (serverId: string, data: CompanionMaintenanceRequest): Promise<CompanionMaintenance> =>
    this.authHttp.put<CompanionMaintenance>(`${this.base(serverId)}/maintenance`, { json: data });
}

export const companionApi = new CompanionApi(authHttp);
