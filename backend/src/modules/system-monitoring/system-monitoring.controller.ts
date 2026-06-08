import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { UserPermissions } from "@shared/types/user.types";
import { CombinedMonitoringDto } from "./dto/combined-monitoring.dto";
import { CpuUsageDto } from "./dto/cpu-usage.dto";
import { DiskInfoDto } from "./dto/disk-info.dto";
import { NetworkInfoDto } from "./dto/network-info.dto";
import { SystemInfoDto } from "./dto/system-info.dto";
import { SystemMonitoringService } from "./system-monitoring.service";

@ApiTags("System Monitoring")
@ApiBearerAuth()
@Controller("api/system-monitoring")
@UseGuards(BearerAuthGuard, PermissionsGuard)
export class SystemMonitoringController {
  constructor(
    private readonly systemMonitoringService: SystemMonitoringService,
  ) {}

  @Get("info")
  @ApiOperation({ summary: "Get system information" })
  @ApiOkResponse({ type: SystemInfoDto })
  @ApiErrorResponses()
  @RequirePermissions(UserPermissions.SYSTEM_MONITORING)
  getSystemInfo(): SystemInfoDto {
    return this.systemMonitoringService.getHardwareInfo();
  }

  @Get("disks")
  @ApiOperation({ summary: "Get disk usage information" })
  @ApiOkResponse({ type: [DiskInfoDto] })
  @ApiErrorResponses()
  @RequirePermissions(UserPermissions.SYSTEM_MONITORING)
  async getDiskInfo(): Promise<DiskInfoDto[]> {
    return this.systemMonitoringService.getDiskInfo();
  }

  @Get("resources")
  @ApiOperation({ summary: "Get current resources usage" })
  @ApiOkResponse({ type: CpuUsageDto })
  @ApiErrorResponses()
  @RequirePermissions(UserPermissions.SYSTEM_MONITORING)
  async getCpuUsage(): Promise<CpuUsageDto> {
    return this.systemMonitoringService.getResourcesUsage();
  }

  @Get("network")
  @ApiOperation({ summary: "Get public and local IP addresses" })
  @ApiOkResponse({ type: NetworkInfoDto })
  @ApiErrorResponses()
  async getNetworkInfo(): Promise<NetworkInfoDto> {
    return this.systemMonitoringService.getNetworkInfo();
  }

  @Get("combined")
  @ApiOperation({ summary: "Get combined system monitoring data" })
  @ApiOkResponse({ type: CombinedMonitoringDto })
  @ApiErrorResponses()
  @RequirePermissions(UserPermissions.SYSTEM_MONITORING)
  async getCombinedMonitoringData(): Promise<CombinedMonitoringDto> {
    const systemInfo = this.systemMonitoringService.getHardwareInfo();
    const [diskInfo, resourcesUsage] = await Promise.all([
      this.systemMonitoringService.getDiskInfo(),
      this.systemMonitoringService.getResourcesUsage(),
    ]);

    const cpuUsage = {
      cpu: resourcesUsage.cpu,
      memory: resourcesUsage.memory,
    };

    const ramUsage = this.systemMonitoringService.calculateRamUsage(
      resourcesUsage.memory,
    );

    return {
      systemInfo,
      diskInfo,
      cpuUsage,
      ramUsage,
      timestamp: new Date().toISOString(),
    };
  }
}
