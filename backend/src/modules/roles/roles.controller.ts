import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { diffChanges } from "@/modules/audit-log/audit-diff";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { AccessArea } from "@shared/access/areas";
import type { IRole } from "@shared/access/roles";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";
import {
  CreateRoleDto,
  DuplicateRoleDto,
  RoleResponseDto,
  UpdateRoleDto,
} from "./dto/role.dto";
import { RolesService, type RoleView } from "./roles.service";

const auditOf = (
  role: Pick<IRole, "name" | "description" | "grants" | "ext">,
) => ({
  name: role.name,
  description: role.description,
  grants: { ...role.grants },
  ext: [...role.ext].sort(),
});

const toDto = (role: RoleView): RoleResponseDto => ({
  ...role,
  builtin: !!role.builtinKey,
});

const created = (role: RoleView) => ({
  resourceId: role.id,
  resourceName: role.name,
  details: { grants: role.grants, ext: role.ext },
});

@ApiTags("Roles")
@ApiBearerAuth()
@Controller("api/roles")
@UseGuards(BearerAuthGuard, AccessGuard)
@RequireAccess(AccessArea.ACCOUNTS, "manage")
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequireAccess(AccessArea.ACCOUNTS, "read")
  @ApiOperation({ summary: "List roles with their member count" })
  @ApiOkResponse({ type: [RoleResponseDto] })
  @ApiErrorResponses([401, 403])
  list(): RoleResponseDto[] {
    return this.roles.list().map(toDto);
  }

  @Get(":id")
  @RequireAccess(AccessArea.ACCOUNTS, "read")
  @ApiOperation({ summary: "Get a role" })
  @ApiParam({ name: "id", description: "Role id" })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiErrorResponses([401, 403, 404])
  get(@Param("id") id: string): RoleResponseDto {
    return toDto(this.roles.get(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a role",
    description: "Non-admins can only give levels and keys they have",
  })
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiErrorResponses([400, 401, 403, 409])
  @Audit({
    action: AuditAction.ROLE_CREATE,
    category: AuditCategory.ROLES,
    resourceType: "role",
    resolve: ({ result }) => created(result),
    resolveError: ({ req }) => ({ resourceName: req.body?.name }),
  })
  create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() actor: IUser,
  ): RoleResponseDto {
    return toDto(this.roles.create(actor, dto));
  }

  @Put(":id")
  @ApiOperation({
    summary: "Update a role",
    description: "Built-in roles can't be renamed, their levels can change",
  })
  @ApiParam({ name: "id", description: "Role id" })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  @Audit({
    action: AuditAction.ROLE_UPDATE,
    category: AuditCategory.ROLES,
    resourceType: "role",
    resolve: ({ result }) => ({ resourceName: result?.name }),
  })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: IUser,
    @Req() req: Request,
  ): RoleResponseDto {
    const { before, after } = this.roles.update(actor, id, dto);
    auditNote(req, {
      resourceName: before.name,
      changes: diffChanges(auditOf(before), auditOf(after)),
    });
    return toDto(after);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a role",
    description: "Built-in roles can't be deleted, members lose its access",
  })
  @ApiParam({ name: "id", description: "Role id" })
  @ApiNoContentResponse({ description: "Role deleted" })
  @ApiErrorResponses([400, 401, 403, 404])
  @Audit({
    action: AuditAction.ROLE_DELETE,
    category: AuditCategory.ROLES,
    resourceType: "role",
  })
  remove(
    @Param("id") id: string,
    @CurrentUser() actor: IUser,
    @Req() req: Request,
  ): void {
    const role = this.roles.remove(actor, id);
    auditNote(req, {
      resourceName: role.name,
      details: { grants: role.grants, ext: role.ext, members: role.members },
    });
  }

  @Post(":id/duplicate")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Copy a role into a new custom role" })
  @ApiParam({ name: "id", description: "Role id to copy" })
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  @Audit({
    action: AuditAction.ROLE_CREATE,
    category: AuditCategory.ROLES,
    resourceType: "role",
    resolve: ({ result }) => created(result),
  })
  duplicate(
    @Param("id") id: string,
    @Body() dto: DuplicateRoleDto,
    @CurrentUser() actor: IUser,
    @Req() req: Request,
  ): RoleResponseDto {
    const copy = this.roles.duplicate(actor, id, dto?.name);
    auditNote(req, { details: { copyOf: this.roles.nameOf(id) } });
    return toDto(copy);
  }
}
