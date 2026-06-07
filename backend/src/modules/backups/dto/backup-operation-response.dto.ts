import { ApiProperty } from "@nestjs/swagger";
import { BackupEntity } from "./backup.entity";

/** Result of a backup create operation: the (optional) backup record plus the task started */
export class BackupOperationResponseDto {
  @ApiProperty({
    type: BackupEntity,
    required: false,
    description: "Created backup record",
  })
  backup?: BackupEntity;

  @ApiProperty({
    description: "ID of the started background task",
    example: "a1b2c3d4",
  })
  taskId: string;
}
