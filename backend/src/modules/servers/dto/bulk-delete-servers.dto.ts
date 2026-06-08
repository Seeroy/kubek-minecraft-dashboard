import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from "class-validator";

export class BulkDeleteServersDto {
  @ApiProperty({ description: "Server IDs to delete", type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[];

  @ApiProperty({ description: "Account password for confirmation" })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
