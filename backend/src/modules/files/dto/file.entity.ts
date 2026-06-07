import { ApiProperty } from "@nestjs/swagger";
import { FileType } from "@shared/types/file.types";

/** A single file or directory entry returned by file listing endpoints */
export class FileEntity {
  @ApiProperty({ description: "Entry name", example: "server.properties" })
  name: string;

  @ApiProperty({
    description: "Path relative to the server root",
    example: "config/server.properties",
  })
  path: string;

  @ApiProperty({ description: "Entry type", enum: FileType })
  type: FileType;

  @ApiProperty({
    description: "Size in bytes (0 for directories)",
    example: 2048,
  })
  size: number;

  @ApiProperty({
    description: "Last modification timestamp",
    type: String,
    format: "date-time",
  })
  modify: Date;
}
