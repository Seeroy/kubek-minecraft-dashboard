import { ApiProperty } from "@nestjs/swagger";

/** Reference to a background task started by an endpoint */
export class TaskRefResponseDto {
  @ApiProperty({
    description: "ID of the started background task",
    example: "a1b2c3d4",
  })
  taskId: string;
}
