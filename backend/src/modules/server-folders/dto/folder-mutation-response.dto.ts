import { ApiProperty } from "@nestjs/swagger";

/** Result of bulk-moving servers between folders */
export class FolderMoveResponseDto {
  @ApiProperty({ description: "Number of servers moved", example: 3 })
  moved: number;
}
