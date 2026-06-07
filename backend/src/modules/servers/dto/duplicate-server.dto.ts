import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class DuplicateServerDto {
  @ApiProperty({ description: "Name of the new (duplicated) server" })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[\p{L}\p{N} _\-.()]+$/u, {
    message: "Server name contains forbidden characters",
  })
  name!: string;
}
