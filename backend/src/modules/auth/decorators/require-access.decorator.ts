import { applyDecorators, SetMetadata } from "@nestjs/common";
import { ApiExtension } from "@nestjs/swagger";
import type { AccessArea, AccessLevel } from "@shared/access/areas";
import { ACCESS_KEY, type AccessRequirement } from "../guards/access.guard";

/** Level the route needs in an area, a handler one overrides the class one */
export function RequireAccess(area: AccessArea, level: AccessLevel) {
  const requirement: AccessRequirement = { area, level };
  return applyDecorators(
    SetMetadata(ACCESS_KEY, requirement),
    ApiExtension("x-access", requirement),
  );
}

/** Read in any server area, for server lists and details */
export function RequireServerView() {
  const requirement: AccessRequirement = { serverView: true };
  return applyDecorators(
    SetMetadata(ACCESS_KEY, requirement),
    ApiExtension("x-access", requirement),
  );
}
