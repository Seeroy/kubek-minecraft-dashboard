import { PERMISSIONS_KEY } from "@/modules/auth/guards/permission.guard";
import { CustomDecorator, SetMetadata } from "@nestjs/common";
import { UserPermissions } from "@shared/types/user.types";

/**
 * Decorator for set route required permissions
 * @param permissions - permissions list, required for access
 */
export const RequirePermissions = (
  ...permissions: UserPermissions[]
): CustomDecorator<string> => {
  return SetMetadata(PERMISSIONS_KEY, permissions);
};
