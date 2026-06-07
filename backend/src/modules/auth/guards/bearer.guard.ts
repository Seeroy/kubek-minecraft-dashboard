import { parseBearerToken } from "@/core/utils/bearer";
import { SessionsService } from "@/modules/sessions/sessions.service";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

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

    const { user, session } = this.sessionsService.authenticate(token);
    request.user = user;
    request.session = session;
    return true;
  }
}
