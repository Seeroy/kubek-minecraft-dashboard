import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  CombinedMonitoringData,
  CpuUsage,
  DiskInfo,
  NetworkInfo,
  SystemInfo,
} from "./system-monitoring.model";

export class SystemMonitoringApi {
  constructor(private authHttp: AuthHttpClient) {}

  getSystemInfo = (): Promise<SystemInfo> =>
    this.authHttp.get<SystemInfo>("system-monitoring/info");

  getDiskInfo = (): Promise<DiskInfo[]> =>
    this.authHttp.get<DiskInfo[]>("system-monitoring/disks");

  getResourcesUsage = (): Promise<CpuUsage> =>
    this.authHttp.get<CpuUsage>("system-monitoring/resources");

  getNetworkInfo = (): Promise<NetworkInfo> =>
    this.authHttp.get<NetworkInfo>("system-monitoring/network");

  getCombinedMonitoringData = (): Promise<CombinedMonitoringData> =>
    this.authHttp.get<CombinedMonitoringData>("system-monitoring/combined");
}

export const systemMonitoringApi = new SystemMonitoringApi(authHttp);
