import { parseBearerToken } from "@/core/utils/bearer";
import { extractClientIp } from "@/core/utils/request";
import {
  ApiKeysService,
  isApiKeyToken,
} from "@/modules/api-keys/api-keys.service";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { IUserSession } from "@shared/types/session.types";
import type { IUser } from "@shared/types/user.types";
import { Socket } from "socket.io";

@Injectable()
export class AuthService {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly apiKeys: ApiKeysService,
  ) {}

  authenticateClient(client: Socket): { user: IUser; session?: IUserSession } {
    const token = parseBearerToken(this.extractAuthHeader(client));
    if (!token) {
      throw new UnauthorizedException("Invalid Authorization header");
    }
    if (isApiKeyToken(token)) {
      return {
        user: this.apiKeys.authenticate(token, extractClientIp(client.request)),
      };
    }
    return this.sessionsService.authenticate(token);
  }

  private extractAuthHeader(client: Socket): string | undefined {
    return (
      client.handshake.headers["authorization"] ||
      client.handshake.headers["Authorization"] ||
      client.handshake.auth?.authorization
    );
  }
}
