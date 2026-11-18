import { ApiErrorCode } from "@/core/errors/error-codes";
import { parseBearerToken } from "@/core/utils/bearer";
import { extractClientIp } from "@/core/utils/request";
import {
  ApiKeysService,
  isApiKeyToken,
} from "@/modules/api-keys/api-keys.service";
import { SessionsService } from "@/modules/sessions/sessions.service";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { SESSION_ONLY_KEY } from "../decorators/session-only.decorator";

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly apiKeys: ApiKeysService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = parseBearerToken(
      request.headers["authorization"] || request.headers["Authorization"],
    );
    if (!token) {
      throw new UnauthorizedException("Invalid Authorization header");
    }

    if (isApiKeyToken(token)) {
      if (
        this.reflector.getAllAndOverride<boolean>(SESSION_ONLY_KEY, targets)
      ) {
        throw new ForbiddenException({
          code: ApiErrorCode.SESSION_REQUIRED,
          message: "Not available with an API key",
        });
      }
      request.user = this.apiKeys.authenticate(token, extractClientIp(request));
      return true;
    }

    const { user, session } = this.sessionsService.authenticate(token);
    request.user = user;
    request.session = session;
    return true;
  }
}
