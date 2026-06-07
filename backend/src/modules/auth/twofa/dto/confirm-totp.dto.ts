import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";

export class ConfirmTotpDto {
  @ApiProperty({ description: "Setup token issued by /totp/setup" })
  @IsString()
  setupToken!: string;

  @ApiProperty({ description: "6-digit TOTP code" })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}
