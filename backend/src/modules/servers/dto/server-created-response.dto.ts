import { ApiProperty } from "@nestjs/swagger";
import { ServerEntity } from "./server.entity";

/** Result of creating / duplicating / importing a server: the new row plus the background task */
export class ServerCreatedResponseDto {
  @ApiProperty({ type: ServerEntity })
  server: ServerEntity;

  @ApiProperty({
    description: "ID of the background task tracking the operation",
    example: "a1b2c3d4",
  })
  taskId: string;
}
