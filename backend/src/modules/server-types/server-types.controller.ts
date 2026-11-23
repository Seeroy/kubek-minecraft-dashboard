import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { ApiErrorCode } from "@/core/errors/error-codes";
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
  Query,
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
import type { CatalogBlueprintIndexItem } from "@shared/types/catalog.types";
import { CatalogService } from "../catalog/catalog.service";
import {
  CatalogBlueprintsResponseDto,
  CatalogQueryDto,
  CatalogReadmeQueryDto,
  CatalogReadmeResponseDto,
} from "../catalog/dto/catalog.dto";
import {
  ServerTypeDto,
  ServerTypeInstallResponseDto,
  ServerTypeVersionDto,
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
    private readonly catalog: CatalogService,
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
    // Hide docker-only blueprints the daemon can't run, dual-capable ones still run native
    const dockerAvailable = this.docker.available();
    return this.registry
      .listValid()
      .filter(
        (b) =>
          b.manifest.runtime.kind !== "docker" ||
          (dockerAvailable && this.docker.profileUsable(b.manifest)),
      )
      .map((b) => ({
        id: b.manifest.id,
        name: b.manifest.name,
        shortName: b.manifest.shortName,
        description: b.manifest.description,
        game: b.manifest.game,
        gameName: b.manifest.gameName,
        icon: this.registry.iconDataUri(b),
        version: b.manifest.version,
        platforms: b.manifest.platforms,
        runtimeKind: b.manifest.runtime.kind,
        dockerCapable: this.docker.profileUsable(b.manifest),
        variables: b.manifest.variables,
        ports: b.manifest.ports,
        configFiles: b.manifest.configFiles ?? [],
        features: b.manifest.features ?? [],
        tags: b.manifest.tags ?? [],
        queryProtocol: b.manifest.query?.protocol,
        source: b.source,
      }));
  }

  @Get("catalog")
  @ApiOperation({
    summary: "Blueprints from the KubekPanel/blueprints catalog",
  })
  @ApiOkResponse({ type: CatalogBlueprintsResponseDto })
  @ApiErrorResponses([401, 403, 502])
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  catalogList(
    @Query() q: CatalogQueryDto,
  ): Promise<CatalogBlueprintsResponseDto> {
    const installed = new Map(
      this.registry
        .list()
        .map((b) => [
          b.manifest.id,
          { version: b.manifest.version, builtIn: b.source === "bundled" },
        ]),
    );
    return this.catalog.list<CatalogBlueprintIndexItem>(
      "blueprints",
      installed,
      q.refresh,
    );
  }

  @Get("catalog/:id/readme")
  @ApiOperation({ summary: "README of a catalog item in the panel language" })
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  @ApiOkResponse({ type: CatalogReadmeResponseDto })
  @ApiErrorResponses([401, 403, 404, 502])
  catalogReadme(
    @Param("id") id: string,
    @Query() q: CatalogReadmeQueryDto,
  ): Promise<CatalogReadmeResponseDto> {
    return this.catalog.readme("blueprints", id, q.lang);
  }

  @Post("catalog/:id/install")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Install or update a blueprint from the catalog" })
  @ApiCreatedResponse({ type: ServerTypeInstallResponseDto })
  @ApiErrorResponses([400, 401, 403, 404, 502])
  // Same as an upload, the resolver code runs in-process
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  @UseGuards(AdminGuard)
  @Audit({
    action: AuditAction.SERVER_TYPE_INSTALL,
    category: AuditCategory.SETTINGS,
    resourceType: "server_type",
    resolve: ({ result }) => ({
      resourceName: result?.name,
      details: { source: "catalog" },
    }),
  })
  async installFromCatalog(
    @Param("id") id: string,
  ): Promise<ServerTypeInstallResponseDto> {
    if (this.registry.get(id)?.source === "bundled")
      throw new BadRequestException("Bundled blueprints cannot be replaced");
    const pkg = await this.catalog.download("blueprints", id);
    const loaded = await this.installer.installFromBuffer(
      pkg.buffer,
      pkg.filename,
      id,
    );
    return {
      id: loaded.manifest.id,
      name: loaded.manifest.name,
      valid: loaded.valid,
    };
  }

  @Get(":id/versions")
  @ApiOperation({ summary: "List versions offered by a blueprint" })
  @ApiOkResponse({ type: [String], description: "Available versions" })
  @ApiErrorResponses([401, 403, 404, 502])
  @RequireAccess(AccessArea.SERVERS, "write")
  async versionsFor(@Param("id") id: string): Promise<string[]> {
    const blueprint = this.findBlueprint(id);
    return this.upstream(() => this.versions.listVersions(blueprint));
  }

  @Get(":id/versions/labeled")
  @ApiOperation({ summary: "List versions offered by a blueprint with labels" })
  @ApiOkResponse({
    type: [ServerTypeVersionDto],
    description: "Available versions, label is null when unknown",
  })
  @ApiErrorResponses([401, 403, 404, 502])
  @RequireAccess(AccessArea.SERVERS, "write")
  async labeledVersionsFor(
    @Param("id") id: string,
  ): Promise<ServerTypeVersionDto[]> {
    const blueprint = this.findBlueprint(id);
    return this.upstream(() => this.versions.listLabeledVersions(blueprint));
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

  private findBlueprint(id: string) {
    const blueprint = this.registry.get(id);
    if (!blueprint) throw new NotFoundException(`Unknown blueprint: ${id}`);
    return blueprint;
  }

  // Versions come from upstream APIs, if they fail it's not on us
  private async upstream<T>(list: () => Promise<T>): Promise<T> {
    try {
      return await list();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const reason = getErrorMessage(error);
      throw new BadGatewayException({
        code: ApiErrorCode.VERSIONS_UNAVAILABLE,
        message: `Failed to list versions: ${reason}`,
        // Shown in the UI as the reason
        details: [{ field: "versions", message: reason }],
      });
    }
  }
}
