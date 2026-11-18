import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class PasswordConfirmDto {
  @ApiProperty({ description: "Current account password" })
  @IsString()
  @MinLength(1)
  password!: string;
}
