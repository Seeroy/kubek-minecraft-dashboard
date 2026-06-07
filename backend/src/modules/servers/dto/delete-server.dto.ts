import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class DeleteServerDto {
  @ApiProperty({ description: "Account password for confirmation" })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ description: "Server name typed by user for confirmation" })
  @IsString()
  @IsNotEmpty()
  confirmName!: string;
}
