import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";

export class ServerPropertiesDto {
  @ApiProperty({
    description: "Server properties as key-value pairs",
    example: {
      motd: "My Server",
      "max-players": "20",
      "online-mode": "true",
    },
  })
  @IsObject()
  properties!: Record<string, string>;
}
