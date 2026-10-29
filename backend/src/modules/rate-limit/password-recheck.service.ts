import { ApiErrorCode } from "@/core/errors/error-codes";
import { comparePassword } from "@/core/utils/security";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { IUser } from "@shared/types/user.types";
import { RateLimitService } from "./rate-limit.service";

/** Confirms the password of an account before a sensitive action */
@Injectable()
export class PasswordRecheckService {
  constructor(private readonly rateLimit: RateLimitService) {}

  async assert(
    user: IUser,
    password: string,
    ip: string | null = null,
  ): Promise<void> {
    this.rateLimit.check("password", user.id);
    // bcrypt is async, parallel requests would all pass the check above
    this.rateLimit.hit("password.attempts", user.id);
    if (!(await comparePassword(password, user.password))) {
      this.rateLimit.fail("password", user.id, {
        userId: user.id,
        username: user.username,
        ip,
      });
      // Not 401: the client signs out on any 401
      throw new BadRequestException({
        code: ApiErrorCode.INVALID_PASSWORD,
        message: "Invalid password",
      });
    }
    this.rateLimit.succeed("password", user.id);
  }
}
