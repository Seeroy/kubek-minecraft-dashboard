import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { PublicUserDto } from "@/core/dto/public-user.dto";
import { toPublicUser } from "@/core/utils/publicUser";
import { extractClientIp } from "@/core/utils/request";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { NotificationService } from "@/modules/telegram-bot/notification.service";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUserSession } from "@shared/types/session.types";
import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { CurrentSession } from "./decorators/current-session.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { LoginResponseDto } from "./dto/login-response.dto";
import { LoginDto } from "./dto/login.dto";
import { BearerAuthGuard } from "./guards/bearer.guard";
import { PermissionsGuard } from "./guards/permission.guard";
import { TwofaService } from "./twofa/twofa.service";

@ApiTags("Auth")
@ApiBearerAuth()
@Controller("api/auth")
@UseGuards(BearerAuthGuard, PermissionsGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly sessionsService: SessionsService,
    private readonly twofaService: TwofaService,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User login" })
  @Public()
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: "Login successful", type: LoginResponseDto })
  @ApiErrorResponses([400, 401])
  @Audit({
    action: AuditAction.AUTH_LOGIN,
    category: AuditCategory.AUTH,
    resourceType: "session",
    // A 2FA-required response isn't a completed login - skip it
    resolve: ({ req, result }) =>
      result?.require2fa
        ? { skip: true }
        : {
            userId: result?.user?.id,
            username: result?.user?.username ?? req.body?.username,
          },
    resolveError: ({ req }) => ({ username: req.body?.username }),
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const ip = extractClientIp(request);
    const userAgent = request.headers["user-agent"] ?? null;

    // 2FA branch
    if (this.twofaService.isEnabledFor(user)) {
      const primary = this.twofaService.primaryMethod(user)!;
      const challenge = await this.twofaService.startChallenge(
        user,
        primary,
        ip,
        userAgent,
      );
      return {
        require2fa: true,
        challengeId: challenge.id,
        primary,
        methods: this.twofaService.enabledMethods(user),
        expiresAt: challenge.expiresAt,
      };
    }

    const { token } = this.sessionsService.create(user.id, ip, userAgent);

    this.notificationService.sendUserNotification(
      user.id,
      `🔐 Account "${user.username}" logged in successfully.`,
    );

    return {
      user: toPublicUser(user),
      token,
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Logout - revoke the current session" })
  @ApiNoContentResponse({ description: "Logged out" })
  @ApiErrorResponses([401])
  @Audit({
    action: AuditAction.AUTH_LOGOUT,
    category: AuditCategory.AUTH,
    resourceType: "session",
  })
  logout(@CurrentSession() session: IUserSession | undefined): void {
    if (session) {
      this.sessionsService.revoke(session.id);
    }
  }

  @Get("profile")
  @ApiOperation({ summary: "Get current user profile" })
  @ApiOkResponse({ description: "User profile", type: PublicUserDto })
  @ApiErrorResponses([401])
  getProfile(@CurrentUser() user: IUser): PublicUserDto {
    return toPublicUser(user);
  }

  @Post("complete-oobe")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mark current user's OOBE as completed" })
  @ApiNoContentResponse({ description: "OOBE marked as completed" })
  @ApiErrorResponses([401])
  completeOOBE(@CurrentUser() user: IUser): void {
    this.authService.completeOOBE(user);
  }
}
