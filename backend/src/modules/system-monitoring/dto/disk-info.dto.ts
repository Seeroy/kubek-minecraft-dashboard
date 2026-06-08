import { ApiProperty } from "@nestjs/swagger";

export class DiskInfoDto {
  @ApiProperty({
    description: "Mount point path",
    example: "/",
  })
  mount: string;

  @ApiProperty({
    description: "Filesystem type",
    example: "ext4",
  })
  type: string;

  @ApiProperty({
    description: "Total disk space in bytes",
    example: 100000000000,
  })
  total: number;

  @ApiProperty({
    description: "Used disk space in bytes",
    example: 50000000000,
  })
  used: number;

  @ApiProperty({
    description: "Available disk space in bytes",
    example: 50000000000,
  })
  available: number;

  @ApiProperty({
    description: "Disk usage percentage",
    example: 50,
  })
  percentage: number;
}
