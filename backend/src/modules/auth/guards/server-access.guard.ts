import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export const SERVER_ACCESS_KEY = "server_access";

/**
 * Guard for checking server access allowed
 */
@Injectable()
export class ServerAccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const serverIdField = this.reflector.getAllAndOverride<string>(
      SERVER_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If serverId field empty - disallow anyway
    if (!serverIdField) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    // Admins can access all servers
    if (user.isAdmin) {
      return true;
    }

    // Is user has no server restrictions
    if (!user.serversRestrict?.enabled) {
      return true;
    }

    // Check for serverId in request
    const serverId = this.extractServerId(request, serverIdField);

    if (!serverId) {
      throw new BadRequestException(`Server ID is empty`);
    }

    // Check server access
    const hasAccess = user.serversRestrict.allowed.includes(serverId);

    if (!hasAccess) {
      throw new ForbiddenException(`Access to server ${serverId} denied`);
    }

    return true;
  }

  private extractServerId(request: any, fieldName: string): string | null {
    // Search in url params
    if (request.params && request.params[fieldName]) {
      return request.params[fieldName];
    }

    // Search in query string
    if (request.query && request.query[fieldName]) {
      return request.query[fieldName];
    }

    // Search in body for POST, PUT, PATCH
    if (request.body && request.body[fieldName]) {
      return request.body[fieldName];
    }

    // Search nested body, e.g. body.server.id
    if (request.body) {
      const value = this.getNestedValue(request.body, fieldName);
      if (typeof value === "string") {
        return value;
      }
    }

    return null;
  }

  // Get a nested value by dotted path, e.g. "server.id"
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((current, key) => {
      if (current && typeof current === "object" && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }
}
