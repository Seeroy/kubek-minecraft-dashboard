import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, Matches } from "class-validator";

/** Interface settings of one browser, counted in telemetry */
export class ClientPrefsDto {
  @ApiProperty({ description: "Interface language code", example: "ru" })
  @IsString()
  @Matches(/^[a-z]{2}(-[A-Za-z]{2})?$/)
  language: string;

  @ApiProperty({
    description: "Light or dark mode",
    enum: ["light", "dark", "system"],
    example: "system",
  })
  @IsIn(["light", "dark", "system"])
  theme: "light" | "dark" | "system";

  @ApiProperty({ description: "Accent color theme", example: "default" })
  @IsString()
  @Matches(/^[a-z-]{1,20}$/)
  colorTheme: string;
}
