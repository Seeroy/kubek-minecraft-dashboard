import { ApiProperty } from "@nestjs/swagger";

/** Text content of a file, returned by the read-file endpoint */
export class FileContentResponseDto {
  @ApiProperty({
    description: "File content decoded as UTF-8 text",
    example: "level-name=world\n",
  })
  content: string;
}
