import { ApiProperty } from "@nestjs/swagger";
import {
  AccessArea,
  AREA_LEVELS,
  isAccessArea,
  isAreaLevel,
} from "@shared/access/areas";
import { registerDecorator, type ValidationOptions } from "class-validator";

/** Level per area, a missing area means no access */
export class AccessMapDto {}

// One optional property per area so the client gets the allowed levels
for (const area of Object.values(AccessArea)) {
  ApiProperty({
    required: false,
    enum: AREA_LEVELS[area],
    description: `Level in ${area}`,
  })(AccessMapDto.prototype, area);
}

/** Effective access from roles and personal grants */
export class UserAccessDto {
  @ApiProperty({ type: AccessMapDto })
  levels: AccessMapDto;

  @ApiProperty({
    description: "Extension permission keys",
    type: [String],
    example: ["ext.worldedit"],
  })
  ext: string[];
}

function isAccessMap(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).every(
    ([area, level]) =>
      isAccessArea(area) &&
      typeof level === "string" &&
      isAreaLevel(area, level),
  );
}

/** Known areas with a level that area supports */
export function IsAccessMap(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: "isAccessMap",
      target: target.constructor,
      propertyName,
      options: {
        message: `${propertyName} must map known areas to levels they support`,
        ...options,
      },
      validator: { validate: isAccessMap },
    });
}
