import { extractClientIp } from "@/core/utils/request";
import { checkSubnetAccess } from "@/core/utils/subnets";
import { ConfigService } from "@/modules/config/config.service";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * Restricts access to clients whose IP falls within a configured set of subnets
 */
@Injectable()
export class SubnetGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const config = this.configService.getAll();
    const request = context.switchToHttp().getRequest();
    const clientIP = extractClientIp(request);
    const verdict = checkSubnetAccess(
      config.subnetsAccessRestriction,
      clientIP,
    );
    if (verdict.allowed) return true;

    switch (verdict.reason) {
      case "unknown_ip":
        throw new ForbiddenException("Unable to determine client IP address");
      case "no_subnets":
        throw new ForbiddenException(
          "Access denied: no allowed subnets configured",
        );
      default:
        throw new ForbiddenException(
          `Access denied: IP ${clientIP} not in allowed subnets`,
        );
    }
  }
}
