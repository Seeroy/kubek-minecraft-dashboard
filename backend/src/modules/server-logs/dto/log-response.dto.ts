import { ApiProperty } from "@nestjs/swagger";

/** A log file available under a server's logs/ directory */
export class LogFileResponseDto {
  @ApiProperty({ description: "File name", example: "latest.log" })
  name: string;

  @ApiProperty({
    description: "Path relative to the server root",
    example: "logs/latest.log",
  })
  path: string;

  @ApiProperty({ description: "File size in bytes", example: 10240 })
  size: number;

  @ApiProperty({
    description: "Last-modified ISO timestamp",
    example: "2026-06-04T12:00:00.000Z",
  })
  modify: string;

  @ApiProperty({
    description: "Whether the file is gzip-compressed",
    example: false,
  })
  gzipped: boolean;
}

/** A line within a log file that matched a search query */
export class LogSearchResultResponseDto {
  @ApiProperty({ description: "1-based line number", example: 42 })
  lineNumber: number;

  @ApiProperty({ description: "Matching line content" })
  line: string;
}
