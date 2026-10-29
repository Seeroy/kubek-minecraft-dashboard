import { canAccessServer, seesAllServers } from "@/core/utils/serverAccess";
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

    // Guard is on the whole controller, handlers opt in with @CheckServerAccess
    if (!serverIdField) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    // All sources have to match, the handler can read any of them
    const serverId = resolveServerId(request, serverIdField);

    if (seesAllServers(user)) {
      return true;
    }

    if (!serverId) {
      throw new BadRequestException(`Server ID is empty`);
    }

    if (!canAccessServer(user, serverId)) {
      throw new ForbiddenException(`Access to server ${serverId} denied`);
    }

    return true;
  }
}

/** All values of the field in params, query and body */
function presentValues(request: any, fieldName: string): unknown[] {
  const sources: unknown[] = [request.params, request.query, request.body];
  const values = sources.map((source) =>
    source && typeof source === "object"
      ? (source as Record<string, unknown>)[fieldName]
      : undefined,
  );
  if (fieldName.includes(".")) {
    values.push(nestedValue(request.body, fieldName));
  }
  return values.filter(
    (value) => value !== undefined && value !== null && value !== "",
  );
}

/** Server id of the request, 400 if sources disagree so query and body can't be mixed */
export function resolveServerId(
  request: any,
  fieldName: string,
): string | null {
  const values = presentValues(request, fieldName);
  if (values.some((value) => typeof value !== "string")) {
    throw new BadRequestException("Invalid server id");
  }
  const distinct = new Set(values as string[]);
  if (distinct.size > 1) {
    throw new BadRequestException("Conflicting server ids in request");
  }
  return distinct.size === 1 ? [...distinct][0] : null;
}

/** Same, but null instead of throwing */
export function requestServerId(
  request: any,
  fieldName: string,
): string | null {
  try {
    return resolveServerId(request, fieldName);
  } catch {
    return null;
  }
}

// Get a nested value by dotted path, e.g. "server.id"
function nestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
