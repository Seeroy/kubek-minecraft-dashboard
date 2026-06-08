import { ApiProperty } from "@nestjs/swagger";
import { ArrayUnique, IsArray, IsOptional, IsString } from "class-validator";

export class MoveServersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  serverIds!: string[];

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Target folder id, null to clear folder",
  })
  @IsOptional()
  @IsString()
  folderId?: string | null;
}
