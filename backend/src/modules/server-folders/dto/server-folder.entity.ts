import { ApiProperty } from "@nestjs/swagger";

/** Domain projection of a server folder */
export class ServerFolderEntity {
  @ApiProperty({ description: "Folder ID", example: "f1a2b3c4" })
  id: string;

  @ApiProperty({ description: "Folder name", example: "Production" })
  name: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Display color",
    example: "#ff8800",
  })
  color?: string | null;

  @ApiProperty({ description: "Sort order", example: 0 })
  sortOrder: number;

  @ApiProperty({
    description: "Creation timestamp (epoch ms)",
    example: 1717500000000,
  })
  createdAt: number;
}
