import { ApiProperty } from "@nestjs/swagger";
import { DiskInfoDto } from "./disk-info.dto";
import { RamUsageDto } from "./ram-usage.dto";
import { SystemInfoDto } from "./system-info.dto";

export class CombinedMonitoringDto {
  @ApiProperty({
    description: "System information",
  })
  systemInfo: SystemInfoDto;

  @ApiProperty({
    description: "Disk usage information",
    type: [DiskInfoDto],
  })
  diskInfo: DiskInfoDto[];

  @ApiProperty({
    description: "CPU usage information",
  })
  cpuUsage: {
    cpu: number;
    memory: { total: number; free: number };
  };

  @ApiProperty({
    description: "RAM usage information",
  })
  ramUsage: RamUsageDto;

  @ApiProperty({
    description: "Timestamp of the data",
    example: "2023-01-01T00:00:00.000Z",
  })
  timestamp: string;
}
