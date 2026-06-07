import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

class RestartOnErrorDto {
  @ApiProperty({ example: true })
  @IsOptional()
  enabled!: boolean;

  @ApiProperty({ example: 3 })
  @IsInt()
  attempts!: number;
}

export class UpdateServerSettingsDto {
  @ApiProperty({ required: false, example: "My Server" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ type: RestartOnErrorDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => RestartOnErrorDto)
  restartOnError?: RestartOnErrorDto;

  @ApiProperty({
    required: false,
    description: "Partial blueprint variable values to merge",
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number | boolean>;
}
