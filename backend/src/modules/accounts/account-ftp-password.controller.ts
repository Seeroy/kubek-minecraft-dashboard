import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { AppEventsService } from "@/core/events/app-events.service";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import { AccessArea } from "@shared/access/areas";
import type { Request } from "express";
import { currentUsername, usernameParam } from "./accounts.params";
import {
  canManageFtpPassword,
  enforcePolicy as enforce,
} from "./accounts.policy";
import { AccountsService } from "./accounts.service";
import { FtpPasswordResponseDto } from "./dto/ftp-password.dto";
import { FtpPasswordService } from "./ftp-password.service";

// operationIds keep the AccountsController names the generated client uses
// me/* routes go first so :username doesn't swallow them
@ApiTags("Accounts")
@ApiBearerAuth()
@Controller("api/accounts")
@UseGuards(BearerAuthGuard, AccessGuard)
export class AccountFtpPasswordController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly ftpPasswords: FtpPasswordService,
    private readonly events: AppEventsService,
  ) {}

  @Get("me/ftp-password")
  @ApiOperation({
    summary: "Reveal the FTP password of the current user",
    description:
      "Read on demand like other panel secrets, 404 when none is set",
    operationId: "AccountsController_revealOwnFtpPassword",
  })
  @RequireAccess(AccessArea.FILES, "read")
  @ApiOkResponse({ type: FtpPasswordResponseDto })
  @ApiErrorResponses([401, 403, 404])
  @Audit({
    action: AuditAction.SETTINGS_SECRET_VIEW,
    category: AuditCategory.SETTINGS,
    resourceType: "account",
    resolve: ({ req }) => ({
      resourceName: currentUsername(req),
      details: { path: "ftp.password" },
    }),
  })
  revealOwnFtpPassword(@CurrentUser() user: IUser): FtpPasswordResponseDto {
    const stored = this.ftpPasswords.reveal(user.id);
    if (!stored) throw new NotFoundException("FTP password is not set");
    return stored;
  }

  @Post("me/ftp-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Issue a new FTP password for the current user",
    description: "An older password stops working right away",
    operationId: "AccountsController_issueOwnFtpPassword",
  })
  @RequireAccess(AccessArea.FILES, "read")
  @ApiOkResponse({ type: FtpPasswordResponseDto })
  @ApiErrorResponses([401, 403])
  @Audit({
    action: AuditAction.ACCOUNT_FTP_PASSWORD_SET,
    category: AuditCategory.ACCOUNT,
    resourceType: "account",
    resolve: ({ req }) => ({ resourceName: currentUsername(req) }),
    resolveError: ({ req }) => ({ resourceName: currentUsername(req) }),
  })
  issueOwnFtpPassword(
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): FtpPasswordResponseDto {
    auditNote(req, { resourceId: user.id });
    return this.issueFtpPassword(user.id);
  }

  @Delete("me/ftp-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Remove the FTP password of the current user",
    operationId: "AccountsController_removeOwnFtpPassword",
  })
  @ApiNoContentResponse({ description: "FTP access disabled for the user" })
  @ApiErrorResponses([401])
  @Audit({
    action: AuditAction.ACCOUNT_FTP_PASSWORD_REMOVE,
    category: AuditCategory.ACCOUNT,
    resourceType: "account",
    resolve: ({ req }) => ({ resourceName: currentUsername(req) }),
  })
  removeOwnFtpPassword(@CurrentUser() user: IUser, @Req() req: Request): void {
    auditNote(req, { resourceId: user.id });
    this.removeFtpPassword(user.id);
  }

  @Post(":username/ftp-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Reset the FTP password of an account",
    description:
      "Issues a new password and returns it once, the old one can't be read",
    operationId: "AccountsController_resetFtpPassword",
  })
  @ApiParam({ name: "username", description: "Username" })
  @RequireAccess(AccessArea.ACCOUNTS, "write")
  @ApiOkResponse({ type: FtpPasswordResponseDto })
  @ApiErrorResponses([401, 403, 404])
  @Audit({
    action: AuditAction.ACCOUNT_FTP_PASSWORD_SET,
    category: AuditCategory.ACCOUNT,
    resourceType: "account",
    resolve: ({ req }) => ({ resourceName: usernameParam(req) }),
    resolveError: ({ req }) => ({ resourceName: usernameParam(req) }),
  })
  resetFtpPassword(
    @Param("username") username: string,
    @CurrentUser() actor: IUser,
    @Req() req: Request,
  ): FtpPasswordResponseDto {
    const user = this.ftpTarget(username, actor);
    auditNote(req, { resourceId: user.id });
    return this.issueFtpPassword(user.id);
  }

  @Delete(":username/ftp-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Remove the FTP password of an account",
    operationId: "AccountsController_removeAccountFtpPassword",
  })
  @ApiParam({ name: "username", description: "Username" })
  @RequireAccess(AccessArea.ACCOUNTS, "write")
  @ApiNoContentResponse({ description: "FTP access disabled for the account" })
  @ApiErrorResponses([401, 403, 404])
  @Audit({
    action: AuditAction.ACCOUNT_FTP_PASSWORD_REMOVE,
    category: AuditCategory.ACCOUNT,
    resourceType: "account",
    resolve: ({ req }) => ({ resourceName: usernameParam(req) }),
    resolveError: ({ req }) => ({ resourceName: usernameParam(req) }),
  })
  removeAccountFtpPassword(
    @Param("username") username: string,
    @CurrentUser() actor: IUser,
    @Req() req: Request,
  ): void {
    const user = this.ftpTarget(username, actor);
    auditNote(req, { resourceId: user.id });
    this.removeFtpPassword(user.id);
  }

  private ftpTarget(username: string, actor: IUser): IUser {
    const user = this.accountsService.findByUsername(username);
    if (!user) {
      throw new NotFoundException("Account does not exist");
    }
    enforce(canManageFtpPassword(actor, user));
    return user;
  }

  private issueFtpPassword(userId: string): FtpPasswordResponseDto {
    const issued = this.ftpPasswords.issue(userId);
    this.events.emit("account.ftp_password_changed", { userId });
    return issued;
  }

  private removeFtpPassword(userId: string): void {
    this.ftpPasswords.remove(userId);
    this.events.emit("account.ftp_password_changed", { userId });
  }
}
