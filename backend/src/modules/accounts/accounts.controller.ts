import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { AppEventsService } from "@/core/events/app-events.service";
import { PublicUserDto } from "@/core/dto/public-user.dto";
import { toPublicUser } from "@/core/utils/publicUser";
import { hashPassword } from "@/core/utils/security";
import { PasswordRecheckService } from "@/modules/rate-limit/password-recheck.service";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { CurrentSession } from "@/modules/auth/decorators/current-session.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { RolesService } from "@/modules/roles/roles.service";
import { extractClientIp } from "@/core/utils/request";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUserSession } from "@shared/types/session.types";
import type { IUser } from "@shared/types/user.types";
import { AccessArea } from "@shared/access/areas";
import type { Request } from "express";
import { accessChange, accountChanges, accountGrants } from "./accounts.audit";
import { usernameParam } from "./accounts.params";
import {
  accessChanged,
  canGrant,
  canManageAccount,
  effectiveAccess,
  enforcePolicy as enforce,
  needsSessionRevoke,
} from "./accounts.policy";
import { AccountsService } from "./accounts.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";

@ApiTags("Accounts")
@ApiBearerAuth()
@Controller("api/accounts")
@UseGuards(BearerAuthGuard, AccessGuard)
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly passwordRecheck: PasswordRecheckService,
    private readonly servers: ServersRepository,
    private readonly sessions: SessionsService,
    private readonly events: AppEventsService,
    private readonly roles: RolesService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get all accounts" })
  @RequireAccess(AccessArea.ACCOUNTS, "read")
  @ApiOkResponse({ description: "List of accounts", type: [PublicUserDto] })
  @ApiErrorResponses([401, 403])
  getAllAccounts(): PublicUserDto[] {
    return this.accountsService.findAll().map(toPublicUser);
  }

  @Get(":username")
  @ApiOperation({ summary: "Get account by username" })
  @ApiParam({ name: "username", description: "Username" })
  @RequireAccess(AccessArea.ACCOUNTS, "read")
  @ApiOkResponse({ description: "Account data", type: PublicUserDto })
  @ApiErrorResponses([401, 403, 404])
  getAccount(@Param("username") username: string): PublicUserDto {
    const user = this.accountsService.findByUsername(username);
    if (!user) {
      throw new NotFoundException("Account does not exist");
    }

    return toPublicUser(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create new account" })
  @ApiCreatedResponse({ description: "Account created" })
  @RequireAccess(AccessArea.ACCOUNTS, "write")
  @Audit({
    action: AuditAction.ACCOUNT_CREATE,
    category: AuditCategory.ACCOUNT,
    resourceType: "account",
    resolve: ({ req }) => ({ resourceName: req.body?.username }),
    resolveError: ({ req }) => ({ resourceName: req.body?.username }),
  })
  @ApiErrorResponses([400, 401, 403])
  async createAccount(
    @Body() body: CreateAccountDto,
    @CurrentUser() actor: IUser,
    @Req() req: Request,
  ): Promise<void> {
    const servers = body.servers ?? [];
    enforce(
      canGrant(actor, {
        roles: this.roles.resolve(body.roles ?? []),
        grants: body.grants ?? {},
        extPermissions: body.extPermissions ?? [],
        serversRestrict: { enabled: servers.length > 0, allowed: servers },
      }),
    );
    const created = await this.accountsService.create(body);
    auditNote(req, {
      resourceId: created.id,
      details: accountGrants(created, this.serverName),
    });
    this.recordAccessChange(req, actor, null, created);
  }

  @Put(":username")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Update account" })
  @ApiParam({ name: "username", description: "Username" })
  @RequireAccess(AccessArea.ACCOUNTS, "write")
  @ApiNoContentResponse({ description: "Account updated" })
  @Audit({
    action: AuditAction.ACCOUNT_UPDATE,
    category: AuditCategory.ACCOUNT,
    resourceType: "account",
    resolve: ({ req }) => ({ resourceName: usernameParam(req) }),
    resolveError: ({ req }) => ({ resourceName: usernameParam(req) }),
  })
  @ApiErrorResponses([401, 403, 404])
  async updateAccount(
    @Param("username") username: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() actor: IUser,
    @CurrentSession() session: IUserSession | undefined,
    @Req() req: Request,
  ): Promise<void> {
    const user = this.accountsService.findByUsername(username);
    if (!user) {
      throw new NotFoundException("Account does not exist");
    }
    enforce(canManageAccount(actor, user));

    const updated: IUser = { ...user };
    if (dto.username !== undefined) updated.username = dto.username;
    if (dto.roles !== undefined) updated.roles = [...new Set(dto.roles)];
    if (dto.grants !== undefined) updated.grants = dto.grants;
    if (dto.extPermissions !== undefined)
      updated.extPermissions = [...new Set(dto.extPermissions)];
    if (dto.serversRestrict !== undefined)
      updated.serversRestrict = dto.serversRestrict;
    if (dto.password) updated.password = await hashPassword(dto.password);
    // Only admins may grant/revoke admin rights
    if (dto.isAdmin !== undefined && actor.isAdmin)
      updated.isAdmin = dto.isAdmin;

    const roles = this.roles.resolve(updated.roles);
    updated.access = effectiveAccess(
      roles,
      updated.grants,
      updated.extPermissions,
    );
    enforce(
      canGrant(actor, {
        roles,
        grants: updated.grants,
        extPermissions: updated.extPermissions,
        serversRestrict: updated.serversRestrict,
      }),
    );

    this.accountsService.update(updated);
    if (needsSessionRevoke(user, updated)) {
      this.revokeSessions(user.id, actor, session);
    }
    // The kept session's sockets still hold rooms joined with the old access
    if (accessChanged(user, updated)) {
      this.events.emit("user.access_changed", { userId: user.id });
    }
    auditNote(req, {
      resourceId: user.id,
      changes: accountChanges(user, updated, this.serverName),
    });
    this.recordAccessChange(req, actor, user, updated);
  }

  @Delete(":username")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete account" })
  @ApiParam({ name: "username", description: "Username" })
  @RequireAccess(AccessArea.ACCOUNTS, "write")
  @ApiNoContentResponse({ description: "Account deleted" })
  @Audit({
    action: AuditAction.ACCOUNT_DELETE,
    category: AuditCategory.ACCOUNT,
    resourceType: "account",
    resolve: ({ req }) => ({ resourceName: usernameParam(req) }),
    resolveError: ({ req }) => ({ resourceName: usernameParam(req) }),
  })
  @ApiErrorResponses([401, 403, 404])
  deleteAccount(
    @Param("username") username: string,
    @CurrentUser() actor: IUser,
    @Req() req: Request,
  ): void {
    const user = this.accountsService.findByUsername(username);
    if (!user) {
      throw new NotFoundException("Account does not exist");
    }
    enforce(canManageAccount(actor, user));
    auditNote(req, { resourceId: user.id });
    this.accountsService.delete(user.id);
    this.events.emit("user.deleted", { userId: user.id });
  }

  @Post(":username/change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change account password" })
  @ApiParam({ name: "username", description: "Username" })
  @RequireAccess(AccessArea.ACCOUNTS, "write")
  @ApiNoContentResponse({ description: "Password changed" })
  @ApiErrorResponses([400, 401, 403, 404])
  @Audit({
    action: AuditAction.ACCOUNT_PASSWORD_CHANGE,
    category: AuditCategory.ACCOUNT,
    resourceType: "account",
    resolve: ({ req }) => ({ resourceName: usernameParam(req) }),
    resolveError: ({ req }) => ({ resourceName: usernameParam(req) }),
  })
  async changePassword(
    @Param("username") username: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() actor: IUser,
    @CurrentSession() session: IUserSession | undefined,
  ): Promise<void> {
    const user = this.accountsService.findByUsername(username);
    if (!user) {
      throw new NotFoundException("Account does not exist");
    }
    enforce(canManageAccount(actor, user));

    await this.passwordRecheck.assert(user, dto.old);

    this.accountsService.update({
      ...user,
      password: await hashPassword(dto.new),
    });
    this.revokeSessions(user.id, actor, session);
  }

  // Log the user out everywhere, but keep this session if it's you
  private revokeSessions(
    userId: string,
    actor: IUser,
    session: IUserSession | undefined,
  ): void {
    const keep = actor.id === userId ? session?.id : undefined;
    this.sessions.revokeAllForUser(userId, keep);
  }

  // Own entry so roles and levels given or taken are easy to find
  private recordAccessChange(
    req: Request,
    actor: IUser,
    before: IUser | null,
    after: IUser,
  ): void {
    const change = accessChange(before, after, (id) => this.roles.nameOf(id));
    if (!change) return;
    this.audit.record({
      action: AuditAction.ACCOUNT_ACCESS_CHANGE,
      category: AuditCategory.ROLES,
      resourceType: "account",
      resourceId: after.id,
      resourceName: after.username,
      changes: change.changes,
      details: change.details,
      userId: actor.id,
      username: actor.username,
      ip: extractClientIp(req),
      userAgent: req.headers?.["user-agent"] ?? null,
      source: "panel",
    });
  }

  private readonly serverName = (id: string) =>
    this.servers.findById(id)?.name ?? id;
}
