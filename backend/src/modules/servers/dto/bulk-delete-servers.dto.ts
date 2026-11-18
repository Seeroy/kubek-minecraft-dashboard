import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsOptional, IsString } from "class-validator";

export class BulkDeleteServersDto {
  @ApiProperty({ description: "Server IDs to delete", type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[];

  @ApiProperty({
    required: false,
    description:
      "Account password for confirmation, not needed with an API key",
  })
  @IsOptional()
  @IsString()
  password?: string;
}
