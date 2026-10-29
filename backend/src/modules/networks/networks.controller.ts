import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { TaskRefResponseDto } from "@/core/dto/task-ref-response.dto";
import {
  Audit,
  auditNote,
  type AuditMeta,
} from "@/modules/audit-log/audit.decorator";
import { NetworksRepository } from "@/modules/database/repositories/networks.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
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
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";
import {
  AddNetworkMemberDto,
  NetworkOrderDto,
  NetworkWizardDto,
} from "./dto/network-requests.dto";
import {
  NetworkCandidatesDto,
  NetworkChangeResultDto,
  NetworkDto,
  NetworkPlanDto,
} from "./dto/network-responses.dto";
import { NetworkMembersService } from "./network-members.service";
import { NetworksService } from "./networks.service";
import { NetworkWizardService } from "./wizard/network-wizard.service";

// Handlers name the network and the server it touched through auditNote
function networkAudit(action: string): AuditMeta {
  const resolve = ({ req }: { req: Request }) => ({
    resourceName: (req.body as { name?: string } | undefined)?.name,
  });
  return {
    action,
    category: AuditCategory.SERVER,
    resourceType: "network",
    resolve,
    resolveError: resolve,
  };
}

@ApiTags("Networks")
@ApiBearerAuth()
@Controller("api/networks")
@UseGuards(BearerAuthGuard, AccessGuard)
export class NetworksController {
  constructor(
    private readonly networks: NetworksService,
    private readonly members: NetworkMembersService,
    private readonly wizard: NetworkWizardService,
    private readonly records: NetworksRepository,
    private readonly servers: ServersRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: "Velocity networks the user can see" })
  @RequireAccess(AccessArea.NETWORKS, "read")
  @ApiOkResponse({ type: [NetworkDto] })
  @ApiErrorResponses([401, 403])
  list(@CurrentUser() user: IUser): Promise<NetworkDto[]> {
    return this.networks.list(user);
  }

  @Get("candidates")
  @ApiOperation({ summary: "Servers and types the wizard can use" })
  @RequireAccess(AccessArea.NETWORKS, "read")
  @ApiOkResponse({ type: NetworkCandidatesDto })
  @ApiErrorResponses([401, 403])
  candidates(@CurrentUser() user: IUser): Promise<NetworkCandidatesDto> {
    return this.networks.candidates(user);
  }

  @Get(":id")
  @ApiOperation({ summary: "One network with its members" })
  @RequireAccess(AccessArea.NETWORKS, "read")
  @ApiOkResponse({ type: NetworkDto })
  @ApiErrorResponses([401, 403, 404])
  get(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ): Promise<NetworkDto> {
    return this.networks.get(id, user);
  }

  @Post("plan")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Files the wizard would change, nothing is written",
  })
  @RequireAccess(AccessArea.NETWORKS, "write")
  @ApiOkResponse({ type: NetworkPlanDto })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  plan(
    @Body() dto: NetworkWizardDto,
    @CurrentUser() user: IUser,
  ): Promise<NetworkPlanDto> {
    return this.wizard.preview(dto, user);
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Create a network",
    description:
      "New servers need servers_create, the result of the task is a NetworkChangeResult",
  })
  @RequireAccess(AccessArea.NETWORKS, "write")
  @Audit(networkAudit(AuditAction.NETWORK_CREATE))
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  async create(
    @Body() dto: NetworkWizardDto,
    @CurrentUser() user: IUser,
  ): Promise<TaskRefResponseDto> {
    const task = await this.wizard.create(dto, user);
    return { taskId: task.id };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Forget a network, server files stay as they are" })
  @RequireAccess(AccessArea.NETWORKS, "manage")
  @Audit(networkAudit(AuditAction.NETWORK_DELETE))
  @ApiNoContentResponse()
  @ApiErrorResponses([401, 403, 404])
  delete(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): void {
    this.note(req, id);
    this.networks.delete(id, user);
  }

  @Post(":id/members")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Link a server, the result of the task is a NetworkChangeResult",
  })
  @RequireAccess(AccessArea.NETWORKS, "write")
  @Audit(networkAudit(AuditAction.NETWORK_MEMBER_ADD))
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  addMember(
    @Param("id") id: string,
    @Body() dto: AddNetworkMemberDto,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): TaskRefResponseDto {
    this.note(req, id, dto.serverId);
    return { taskId: this.members.addMember(id, dto.serverId, user).id };
  }

  @Delete(":id/members/:serverId")
  @ApiOperation({
    summary: "Unlink a server from the proxy, its own files stay",
  })
  @RequireAccess(AccessArea.NETWORKS, "write")
  @Audit(networkAudit(AuditAction.NETWORK_MEMBER_REMOVE))
  @ApiOkResponse({ type: NetworkChangeResultDto })
  @ApiErrorResponses([401, 403, 404])
  removeMember(
    @Param("id") id: string,
    @Param("serverId") serverId: string,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): Promise<NetworkChangeResultDto> {
    this.note(req, id, serverId);
    return this.members.removeMember(id, serverId, user);
  }

  @Put(":id/order")
  @ApiOperation({
    summary: "Set the try order, the first server is the default",
  })
  @RequireAccess(AccessArea.NETWORKS, "write")
  @Audit(networkAudit(AuditAction.NETWORK_ORDER_UPDATE))
  @ApiOkResponse({ type: NetworkChangeResultDto })
  @ApiErrorResponses([400, 401, 403, 404])
  setOrder(
    @Param("id") id: string,
    @Body() dto: NetworkOrderDto,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): Promise<NetworkChangeResultDto> {
    this.note(req, id);
    auditNote(req, { details: { order: dto.order.map(this.serverName) } });
    return this.members.setOrder(id, dto.order, user);
  }

  @Post(":id/secret/rotate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "New forwarding secret for the proxy and every backend",
  })
  @RequireAccess(AccessArea.NETWORKS, "manage")
  @Audit(networkAudit(AuditAction.NETWORK_SECRET_ROTATE))
  @ApiOkResponse({ type: NetworkChangeResultDto })
  @ApiErrorResponses([400, 401, 403, 404])
  rotateSecret(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): Promise<NetworkChangeResultDto> {
    this.note(req, id);
    return this.members.rotateSecret(id, user);
  }

  // A network action shows up on the proxy unless it is about one member
  private note(req: Request, id: string, serverId?: string): void {
    const network = this.records.findById(id);
    auditNote(req, {
      resourceId: id,
      resourceName: network?.name,
      serverId: serverId ?? network?.proxyServerId,
    });
  }

  private readonly serverName = (id: string) =>
    this.servers.findById(id)?.name ?? id;
}
