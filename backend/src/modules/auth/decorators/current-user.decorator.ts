import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { IUser } from "@shared/types/user.types";

/**
 * Decorator to extract the current authenticated user from the request.
 * Use this in controllers to get the logged-in user
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
