import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { PublicUserDto } from "@/core/dto/public-user.dto";
import { toPublicUser } from "@/core/utils/publicUser";
import { comparePassword, hashPassword } from "@/core/utils/security";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
import {
  BadRequestException,
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
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtension,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import { UserPermissions } from "@shared/types/user.types";
import { AccountsService } from "./accounts.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { UserPreferencesResponseDto } from "./dto/user-preferences-response.dto";

@ApiTags("Accounts")
@ApiBearerAuth()
@Controller("api/accounts")
@UseGuards(BearerAuthGuard, PermissionsGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: "Get all accounts" })
  @RequirePermissions(UserPermissions.ACCOUNTS_MANAGEMENT)
  @ApiExtension("x-permissions", [UserPermissions.ACCOUNTS_MANAGEMENT])
  @ApiOkResponse({ description: "List of accounts", type: [PublicUserDto] })
  @ApiErrorResponses([401, 403])
  getAllAccounts(): PublicUserDto[] {
    return this.accountsService.findAll().map(toPublicUser);
  }

  @Get("me/preferences")
  @ApiOperation({ summary: "Get current user's preferences" })
  @ApiOkResponse({ type: UserPreferencesResponseDto })
  @ApiErrorResponses([401])
  getMyPreferences(@CurrentUser() user: IUser): UserPreferencesResponseDto {
    return {
      twofaPrimary: user.twofaPrimary ?? null,
      notifyTaskResults: !!user.notifyTaskResults,
      totpEnabled: !!user.totpEnabled,
      telegram2faEnabled: !!user.telegram2faEnabled,
      dashboardLayout: user.dashboardLayout ?? null,
    };
  }

  @Patch("me/preferences")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update current user's preferences (2FA primary, notifications)",
  })
  @ApiOkResponse({ type: UserPreferencesResponseDto })
  @ApiErrorResponses([400, 401])
  updateMyPreferences(
    @CurrentUser() user: IUser,
    @Body() dto: UpdatePreferencesDto,
  ): UserPreferencesResponseDto {
    const next = { ...user };
    if (dto.twofaPrimary !== undefined) {
      if (dto.twofaPrimary === "totp" && !user.totpEnabled) {
        throw new BadRequestException("TOTP is not enabled");
      }
      if (dto.twofaPrimary === "telegram" && !user.telegram2faEnabled) {
        throw new BadRequestException("Telegram 2FA is not enabled");
      }
      next.twofaPrimary = dto.twofaPrimary;
    }
    if (dto.notifyTaskResults !== undefined) {
      next.notifyTaskResults = dto.notifyTaskResults;
    }
    if (dto.dashboardLayout !== undefined) {
      next.dashboardLayout = dto.dashboardLayout;
    }
    this.accountsService.update(next);
    return {
      twofaPrimary: next.twofaPrimary ?? null,
      notifyTaskResults: !!next.notifyTaskResults,
      dashboardLayout: next.dashboardLayout ?? null,
    };
  }

  @Get(":username")
  @ApiOperation({ summary: "Get account by username" })
  @ApiParam({ name: "username", description: "Username" })
  @RequirePermissions(UserPermissions.ACCOUNTS_MANAGEMENT)
  @ApiExtension("x-permissions", [UserPermissions.ACCOUNTS_MANAGEMENT])
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
  @RequirePermissions(UserPermissions.ACCOUNTS_MANAGEMENT)
  @ApiExtension("x-permissions", [UserPermissions.ACCOUNTS_MANAGEMENT])
  @Audit({
    action: AuditAction.ACCOUNT_CREATE,
    category: AuditCategory.ACCOUNT,
    resourceType: "account",
    resolve: ({ req }) => ({
      resourceName: req.body?.username,
      details: {
        permissions: req.body?.permissions,
        isAdmin: req.body?.isAdmin,
      },
    }),
    resolveError: ({ req }) => ({ resourceName: req.body?.username }),
  })
  @ApiErrorResponses([400, 401, 403])
  async createAccount(@Body() body: CreateAccountDto): Promise<void> {
    await this.accountsService.create(body);
  }

  @Put(":username")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Update account" })
  @ApiParam({ name: "username", description: "Username" })
  @RequirePermissions(UserPermissions.ACCOUNTS_MANAGEMENT)
  @ApiExtension("x-permissions", [UserPermissions.ACCOUNTS_MANAGEMENT])
  @ApiNoContentResponse({ description: "Account updated" })
  @Audit({
    action: AuditAction.ACCOUNT_UPDATE,
    category: AuditCategory.ACCOUNT,
    resourceType: "account",
    resolve: ({ req }) => ({
      resourceId: req.params?.username,
      resourceName: req.params?.username,
      details: {
        fields: Object.keys(req.body ?? {}).filter((k) => k !== "password"),
      },
    }),
    resolveError: ({ req }) => ({ resourceName: req.params?.username }),
  })
  @ApiErrorResponses([401, 403, 404])
  async updateAccount(
    @Param("username") username: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() actor: IUser,
  ): Promise<void> {
    const user = this.accountsService.findByUsername(username);
    if (!user) {
      throw new NotFoundException("Account does not exist");
    }

    const updated: IUser = { ...user };
    if (dto.username !== undefined) updated.username = dto.username;
    if (dto.permissions !== undefined) updated.permissions = dto.permissions;
    if (dto.serversRestrict !== undefined)
      updated.serversRestrict = dto.serversRestrict;
    if (dto.password) updated.password = await hashPassword(dto.password);
    // Only admins may grant/revoke admin rights - prevents privilege escalation
    // by users who merely hold ACCOUNTS_MANAGEMENT
    if (dto.isAdmin !== undefined && actor.isAdmin)
      updated.isAdmin = dto.isAdmin;

    this.accountsService.update(updated);
  }

  @Delete(":username")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete account" })
  @ApiParam({ name: "username", description: "Username" })
  @RequirePermissions(UserPermissions.ACCOUNTS_MANAGEMENT)
  @ApiExtension("x-permissions", [UserPermissions.ACCOUNTS_MANAGEMENT])
  @ApiNoContentResponse({ description: "Account deleted" })
  @Audit({
    action: AuditAction.ACCOUNT_DELETE,
    category: AuditCategory.ACCOUNT,
    resourceType: "account",
    resolve: ({ req }) => ({
      resourceId: req.params?.username,
      resourceName: req.params?.username,
    }),
    resolveError: ({ req }) => ({ resourceName: req.params?.username }),
  })
  @ApiErrorResponses([401, 403, 404])
  deleteAccount(@Param("username") username: string): void {
    const user = this.accountsService.findByUsername(username);
    if (!user) {
      throw new NotFoundException("Account does not exist");
    }
    this.accountsService.delete(user.id);
  }

  @Post(":username/change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change account password" })
  @ApiParam({ name: "username", description: "Username" })
  @RequirePermissions(UserPermissions.ACCOUNTS_MANAGEMENT)
  @ApiExtension("x-permissions", [UserPermissions.ACCOUNTS_MANAGEMENT])
  @ApiNoContentResponse({ description: "Password changed" })
  @ApiErrorResponses([400, 401, 403, 404])
  async changePassword(
    @Param("username") username: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    const user = this.accountsService.findByUsername(username);
    if (!user) {
      throw new NotFoundException("Account does not exist");
    }

    const valid = await comparePassword(dto.old, user.password);
    if (!valid) {
      throw new BadRequestException("Invalid old password");
    }

    this.accountsService.update({
      ...user,
      password: await hashPassword(dto.new),
    });
  }
}
