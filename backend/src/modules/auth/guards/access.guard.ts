import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AccessArea, AccessLevel } from "@shared/access/areas";
import { can, seesServers } from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";

export const ACCESS_KEY = "access";

/** A level in one area, or read in any server area to see servers at all */
export type AccessRequirement =
  { area: AccessArea; level: AccessLevel } | { serverView: true };

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AccessRequirement>(
      ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const user = context.switchToHttp().getRequest<{ user?: IUser }>().user;
    if (!user) throw new ForbiddenException("User not authenticated");

    if ("serverView" in required) {
      if (!seesServers(user)) {
        throw new ForbiddenException(
          "Insufficient access. Required: servers view",
        );
      }
    } else if (!can(user, required.area, required.level)) {
      throw new ForbiddenException(
        `Insufficient access. Required: ${required.area} ${required.level}`,
      );
    }
    return true;
  }
}
