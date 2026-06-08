import { ApiProperty } from "@nestjs/swagger";
import {
  ServerStatus,
  type ServerVariableValue,
} from "@shared/types/server/server.types";

/** Restart-on-error policy for a server */
export class ServerRestartPropsDto {
  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiProperty({ example: 3 })
  attempts: number;
}

/** Domain projection of a server */
export class ServerEntity {
  @ApiProperty({ description: "Server ID", example: "a1b2c3d4" })
  id: string;

  @ApiProperty({ description: "Server name", example: "My server" })
  name: string;

  @ApiProperty({ enum: ServerStatus, example: ServerStatus.STOPPED })
  status: ServerStatus;

  @ApiProperty({ type: ServerRestartPropsDto })
  restartOnError: ServerRestartPropsDto;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Containing folder id",
  })
  folderId?: string | null;

  @ApiProperty({ description: "Blueprint id", example: "com.kubek.paper" })
  blueprintId: string;

  @ApiProperty({ required: false, description: "Blueprint version" })
  blueprintVersion?: string;

  @ApiProperty({
    description: "Blueprint variable values keyed by variable name",
    example: { GAME_VERSION: "1.21.1", XMX: 2048 },
    additionalProperties: true,
  })
  variables: Record<string, ServerVariableValue>;

  @ApiProperty({
    required: false,
    enum: ["native", "docker"],
    example: "native",
  })
  runtimeKind?: "native" | "docker";
}
