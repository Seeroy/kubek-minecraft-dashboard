import { parseBearerToken } from "@/core/utils/bearer";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { IUserSession } from "@shared/types/session.types";
import type { IUser } from "@shared/types/user.types";
import { Socket } from "socket.io";

@Injectable()
export class AuthService {
  constructor(private readonly sessionsService: SessionsService) {}

  authenticateClient(client: Socket): { user: IUser; session: IUserSession } {
    const token = parseBearerToken(this.extractAuthHeader(client));
    if (!token) {
      throw new UnauthorizedException("Invalid Authorization header");
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
