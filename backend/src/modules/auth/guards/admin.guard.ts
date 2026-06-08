import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

/**
 * Restricts a route to admin users
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }
    if (!user.isAdmin) {
      throw new ForbiddenException("Admin privileges required");
    }
    return true;
  }
}
