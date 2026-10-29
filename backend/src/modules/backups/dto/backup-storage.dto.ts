import type { BackupStorage, OrphanArchive } from "@shared/types/backup.types";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { SecretHintDto } from "@/modules/kubek/dto/configuration.dto";

export class S3ConfigInputDto {
  @ApiProperty({
    description: "S3 endpoint, empty for AWS",
    example: "https://s3.eu-central-003.backblazeb2.com",
  })
  @ValidateIf((_, v) => v !== "")
  @IsUrl({ require_tld: false, require_protocol: true })
  endpoint: string;

  @ApiProperty({
    description: "Region, empty when the provider does not need it",
    example: "auto",
  })
  @IsString()
  @MaxLength(64)
  region: string;

  @ApiProperty({ example: "kubek-backups" })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/, {
    message: "Invalid bucket name",
  })
  bucket: string;

  @ApiProperty({ description: "Folder inside the bucket", example: "panel-1" })
  @IsString()
  @MaxLength(200)
  @Matches(/^[^\\]*$/)
  prefix: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  accessKeyId: string;

  @ApiProperty({ required: false, description: "Blank keeps the stored key" })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  secretAccessKey?: string;

  @ApiProperty({ description: "Bucket in the host name instead of the path" })
  @IsBoolean()
  virtualHostedStyle: boolean;
}

export class BackupStorageInputDto {
  @ApiProperty({ example: "Backblaze" })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @ApiProperty({ type: S3ConfigInputDto })
  @ValidateNested()
  @Type(() => S3ConfigInputDto)
  config: S3ConfigInputDto;
}

export class S3ConfigViewDto {
  @ApiProperty() endpoint: string;
  @ApiProperty() region: string;
  @ApiProperty() bucket: string;
  @ApiProperty() prefix: string;
  @ApiProperty() accessKeyId: string;
  @ApiProperty({ type: SecretHintDto }) secretAccessKey: SecretHintDto;
  @ApiProperty() virtualHostedStyle: boolean;
}

export class BackupStorageDto implements BackupStorage {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ["s3"] }) driver: "s3";
  @ApiProperty({ type: S3ConfigViewDto }) config: S3ConfigViewDto;
  @ApiProperty() createdAt: number;
  @ApiProperty() updatedAt: number;
}

export class OrphanArchiveDto implements OrphanArchive {
  @ApiProperty({ description: "Path relative to the backups folder" })
  key: string;
  @ApiProperty() size: number;
  @ApiProperty() modifiedAt: number;
}

export class DeleteOrphansDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  keys: string[];
}

export class DeleteOrphansResultDto {
  @ApiProperty() removed: number;
}
