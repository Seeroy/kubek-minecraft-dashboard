import { ApiProperty } from "@nestjs/swagger";

/** A server that could not be deleted during a bulk delete, with the reason */
export class BulkDeleteFailureDto {
  @ApiProperty({ description: "Server ID", example: "a1b2c3d4" })
  id: string;

  @ApiProperty({ description: "Failure reason", example: "NOT_FOUND" })
  reason: string;
}

/** Summary of a bulk-delete operation */
export class BulkDeleteResultDto {
  @ApiProperty({
    type: [String],
    description: "IDs of successfully deleted servers",
  })
  deleted: string[];

  @ApiProperty({
    type: [BulkDeleteFailureDto],
    description: "Servers that failed to delete",
  })
  failed: BulkDeleteFailureDto[];
}
