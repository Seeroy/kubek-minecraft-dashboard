import { ApiProperty } from "@nestjs/swagger";

/** FTP password of an account with the time it was set */
export class FtpPasswordResponseDto {
  @ApiProperty({
    description: "FTP password",
    example: "q3Xv0tH4c5yWkP9aZ1mN7bLe",
  })
  password!: string;

  @ApiProperty({
    description: "When the password was set (ms)",
    example: 1735689600000,
  })
  setAt!: number;
}
