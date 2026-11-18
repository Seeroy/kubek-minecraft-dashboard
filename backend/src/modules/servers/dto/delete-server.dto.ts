import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class DeleteServerDto {
  @ApiProperty({
    required: false,
    description:
      "Account password for confirmation, not needed with an API key",
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ description: "Server name typed by user for confirmation" })
  @IsString()
  @IsNotEmpty()
  confirmName!: string;
}
