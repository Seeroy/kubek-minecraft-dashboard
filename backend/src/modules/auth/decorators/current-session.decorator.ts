import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { IUserSession } from "@shared/types/session.types";

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IUserSession | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.session;
  },
);
