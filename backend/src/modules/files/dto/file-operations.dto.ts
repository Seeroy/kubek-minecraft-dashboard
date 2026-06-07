import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";

// DTO for scanning directory
export class ScanDirectoryDto {
  @ApiProperty({
    description: "Directory path to scan",
    example: "/logs",
    default: "/",
  })
  @IsString()
  @IsOptional()
  path?: string = "/";
}

// DTO for file operations
export class FileOperationDto {
  @ApiProperty({
    description: "File or directory path",
    example: "/config/server.properties",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  path: string;
}

// DTO for renaming files
export class RenameFileDto extends FileOperationDto {
  @ApiProperty({
    description: "New name for the file or directory",
    example: "server-backup.properties",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  newName: string;
}

// DTO for creating directory
export class CreateDirectoryDto extends FileOperationDto {
  @ApiProperty({
    description: "Name of the new directory",
    example: "backups",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

// DTO for writing file content
export class WriteFileDto extends FileOperationDto {
  @ApiProperty({
    description: "File content to write",
    example: "server-port=25565\ngamemode=survival",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  data: string;
}

// DTO for batch operations on multiple paths (e.g. delete)
export class BatchPathsDto {
  @ApiProperty({
    description: "List of file or directory paths",
    example: ["/logs/latest.log", "/plugins/old.jar"],
    required: true,
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  paths: string[];
}

// DTO for creating a ZIP archive from selected paths
export class CreateArchiveDto {
  @ApiProperty({
    description:
      "List of source file or directory paths to include in the archive",
    example: ["/logs/latest.log", "/plugins"],
    required: true,
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  paths: string[];

  @ApiProperty({
    description: "Archive file name without extension (.zip is appended)",
    example: "logs-2026-05-12",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^/\\:*?"<>|]+$/, {
    message:
      "archiveName must not contain path separators or reserved characters",
  })
  archiveName: string;

  @ApiProperty({
    description: "Directory path where the archive will be saved",
    example: "/",
    required: true,
  })
  @IsString()
  destPath: string;
}

// DTO for extracting a ZIP archive into a subdirectory next to the archive
export class ExtractArchiveDto {
  @ApiProperty({
    description: "Path to the archive file to extract",
    example: "/backup-2026-05-12.zip",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  path: string;
}

// DTO for uploading file query parameters
export class UploadFileQueryDto {
  @ApiProperty({
    description: "Directory path where to upload the file",
    example: "/plugins",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  path: string;
}
