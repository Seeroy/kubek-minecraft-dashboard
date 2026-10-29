import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsString, IsUUID } from "class-validator";

export class PinBackupDto {
  @ApiProperty({ description: "Pinned backups are never removed by retention" })
  @IsBoolean()
  pinned: boolean;
}

export class UploadBackupDto {
  @ApiProperty({ description: "Storage to upload the archive to" })
  @IsUUID()
  storageId: string;
}

export class DownloadUrlDto {
  @ApiProperty({
    description: "Short lived link to the archive in the storage",
  })
  @IsString()
  url: string;
}
