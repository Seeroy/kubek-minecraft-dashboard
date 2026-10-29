import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { getErrorMessage } from "@/core/utils/error";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { AdminGuard } from "@/modules/auth/guards/admin.guard";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import {
  ServerTypeDto,
  ServerTypeInstallResponseDto,
} from "./dto/server-type.dto";
import { DockerService } from "./runtime/docker.service";
import { ServerTypesInstaller } from "./server-types-installer.service";
import { ServerTypesRegistry } from "./server-types-registry.service";
import { VersionResolverService } from "./versions/version-resolver.service";

@ApiTags("Server Types")
@ApiBearerAuth()
@Controller("api/server-types")
@UseGuards(BearerAuthGuard, AccessGuard)
export class ServerTypesController {
  constructor(
    private readonly registry: ServerTypesRegistry,
    private readonly versions: VersionResolverService,
    private readonly installer: ServerTypesInstaller,
    private readonly docker: DockerService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List installable server-type blueprints" })
  @ApiOkResponse({
    type: [ServerTypeDto],
    description: "Installable blueprints",
  })
  @ApiErrorResponses([401, 403])
  @RequireAccess(AccessArea.SERVERS, "write")
  list(): ServerTypeDto[] {
    // Hide docker-only blueprints when the daemon is down, dual-capable ones still run native
    const dockerAvailable = this.docker.available();
    return this.registry
      .listValid()
      .filter((b) => dockerAvailable || b.manifest.runtime.kind !== "docker")
      .map((b) => ({
        id: b.manifest.id,
        name: b.manifest.name,
        shortName: b.manifest.shortName,
        description: b.manifest.description,
        game: b.manifest.game,
        icon: this.registry.iconDataUri(b),
        version: b.manifest.version,
        platforms: b.manifest.platforms,
        runtimeKind: b.manifest.runtime.kind,
        dockerCapable: !!b.manifest.dockerProfile,
        variables: b.manifest.variables,
        ports: b.manifest.ports,
        configFiles: b.manifest.configFiles ?? [],
        features: b.manifest.features ?? [],
        queryProtocol: b.manifest.query?.protocol,
        source: b.source,
      }));
  }

  @Get(":id/versions")
  @ApiOperation({ summary: "List versions offered by a blueprint" })
  @ApiOkResponse({ type: [String], description: "Available versions" })
  @ApiErrorResponses([401, 403, 404, 502])
  @RequireAccess(AccessArea.SERVERS, "write")
  async versionsFor(@Param("id") id: string): Promise<string[]> {
    const blueprint = this.registry.get(id);
    if (!blueprint) throw new NotFoundException(`Unknown blueprint: ${id}`);
    try {
      return await this.versions.listVersions(blueprint);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // Versions come from upstream APIs, if they fail it's not on us
      throw new BadGatewayException(
        `Failed to list versions: ${getErrorMessage(error)}`,
      );
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Install a blueprint from an uploaded file" })
  @ApiCreatedResponse({
    type: ServerTypeInstallResponseDto,
    description: "Installed blueprint summary",
  })
  @ApiErrorResponses([400, 401, 403])
  @ApiConsumes("multipart/form-data")
  // Installing executes the blueprint resolver code in-process  restrict to admins
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  @Audit({
    action: AuditAction.SERVER_TYPE_INSTALL,
    category: AuditCategory.SETTINGS,
    resourceType: "server_type",
  })
  async install(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ServerTypeInstallResponseDto> {
    if (!file) throw new BadRequestException("Provide a blueprint file");
    const loaded = await this.installer.installFromFile(file);
    return {
      id: loaded.manifest.id,
      name: loaded.manifest.name,
      valid: loaded.valid,
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove an installed blueprint" })
  @ApiNoContentResponse({ description: "Removed blueprint" })
  @ApiErrorResponses([400, 401, 403, 404])
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  @Audit({
    action: AuditAction.SERVER_TYPE_DELETE,
    category: AuditCategory.SETTINGS,
    resourceType: "server_type",
  })
  remove(@Param("id") id: string): void {
    this.installer.remove(id);
  }
}
