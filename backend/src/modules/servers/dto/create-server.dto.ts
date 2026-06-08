import { ApiProperty } from "@nestjs/swagger";
import { type NewServerProps } from "@shared/types/server/server.types";
import { IsNotEmpty, IsObject, IsString } from "class-validator";

export class CreateServerDto implements NewServerProps {
  @ApiProperty({ example: "My Server" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "com.kubek.paper" })
  @IsString()
  @IsNotEmpty()
  blueprintId!: string;

  @ApiProperty({
    description: "Blueprint variable values keyed by variable/port key",
    type: "object",
    additionalProperties: {
      oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
    },
    example: { motd: "Hello world", "server-port": 25565, pvp: true },
  })
  @IsObject()
  variables!: Record<string, string | number | boolean>;
}
