import { ModsService } from "@/modules/mods/mods.service";
import { resolveServerGameVersion } from "@/modules/plugins/modrinth-content.service";
import { PluginsService } from "@/modules/plugins/plugins.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { ServersService } from "@/modules/servers/servers.service";
import type { BlueprintFeature } from "@kubekpanel/blueprint-sdk";
import { Injectable } from "@nestjs/common";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import { AccessArea } from "@shared/access/areas";
import { z } from "zod";
import { failure, json, serverArgs, text } from "./tool-args";
import { type AssistantTool, type ToolGroup, defineTool } from "./tool.types";

type ContentKind = "plugin" | "mod";

const FEATURE: Record<ContentKind, BlueprintFeature> = {
  plugin: "plugins:modrinth",
  mod: "mods:fabric",
};

@Injectable()
export class ContentTools implements ToolGroup {
  constructor(
    private readonly servers: ServersService,
    private readonly registry: ServerTypesRegistry,
    private readonly plugins: PluginsService,
    private readonly mods: ModsService,
  ) {}

  tools(): AssistantTool[] {
    return [this.listContent(), this.searchModrinth(), this.installContent()];
  }

  private listContent() {
    return defineTool({
      name: "list_content",
      description: "Plugins or mods installed on a server",
      kind: "read",
      access: [AccessArea.CONTENT, "read"],
      serverScoped: true,
      args: serverArgs({}),
      run: async (_ctx, { serverId }) => {
        const kind = this.kindOf(serverId);
        if (!kind) return text("This server type has no plugins or mods");
        const installed = await this.engine(kind).listInstalled(serverId);
        return json({
          kind,
          items: installed.map((item) => ({
            file: item.fileName,
            title: item.metadata?.title ?? null,
            projectId: item.projectId || null,
            version: item.version?.versionNumber ?? null,
            hasUpdate: item.hasUpdate,
          })),
        });
      },
    });
  }

  private searchModrinth() {
    return defineTool({
      name: "search_modrinth",
      description:
        "Search Modrinth for plugins or mods that fit a server's type and game version",
      kind: "read",
      access: [AccessArea.CONTENT, "read"],
      serverScoped: true,
      args: serverArgs({
        query: z.string().min(1).max(100),
        limit: z.number().int().min(1).max(20).default(8),
      }),
      run: async (_ctx, { serverId, query, limit }) => {
        const kind = this.kindOf(serverId);
        if (!kind) return failure("This server type has no plugins or mods");
        const result = await this.engine(kind).search({
          query,
          limit,
          offset: 0,
          gameVersion: this.gameVersion(serverId),
        });
        return json(
          result.hits.map((hit) => ({
            projectId: hit.project_id,
            title: hit.title,
            description: hit.description,
            downloads: hit.downloads,
          })),
        );
      },
    });
  }

  private installContent() {
    return defineTool({
      name: "install_content",
      description:
        "Install a Modrinth plugin or mod on a server, the newest version that fits its game version",
      kind: "write",
      access: [AccessArea.CONTENT, "write"],
      serverScoped: true,
      args: serverArgs({
        projectId: z.string().min(1).max(64),
        versionId: z.string().max(64).optional(),
      }),
      preview: async (_ctx, { serverId, projectId, versionId }) => {
        const kind = this.requireKind(serverId);
        const project = await this.engine(kind).getProject(projectId);
        const version = await this.pickVersion(
          kind,
          serverId,
          projectId,
          versionId,
        );
        return {
          type: "summary",
          title: `Install ${project.title}`,
          lines: [
            `${kind}: ${project.title}`,
            `version: ${version.version_number}`,
          ],
        };
      },
      run: async ({ user }, { serverId, projectId, versionId }) => {
        const kind = this.requireKind(serverId);
        const version = await this.pickVersion(
          kind,
          serverId,
          projectId,
          versionId,
        );
        const { taskId } = await this.engine(kind).installPlugin(user.id, {
          serverId,
          projectId,
          versionId: version.id,
          installDependencies: true,
        });
        return text(
          `Installing ${version.version_number} in the background, task ${taskId}`,
        );
      },
      audit: ({ projectId }) => ({
        action: AuditAction.CONTENT_INSTALL,
        category: AuditCategory.SERVER,
        resourceName: projectId,
      }),
    });
  }

  private async pickVersion(
    kind: ContentKind,
    serverId: string,
    projectId: string,
    versionId?: string,
  ) {
    const versions = await this.engine(kind).getProjectVersions(projectId, {
      gameVersion: this.gameVersion(serverId),
    });
    const version = versionId
      ? versions.find((v) => v.id === versionId)
      : (versions.find((v) => v.version_type === "release") ?? versions[0]);
    if (!version) throw new Error("No version fits this server");
    return version;
  }

  private kindOf(serverId: string): ContentKind | null {
    const server = this.servers.findById(serverId);
    const features =
      (server && this.registry.get(server.blueprintId)?.manifest.features) ||
      [];
    if (features.includes(FEATURE.plugin)) return "plugin";
    if (features.includes(FEATURE.mod)) return "mod";
    return null;
  }

  private requireKind(serverId: string): ContentKind {
    const kind = this.kindOf(serverId);
    if (!kind) throw new Error("This server type has no plugins or mods");
    return kind;
  }

  private gameVersion(serverId: string): string | undefined {
    const server = this.servers.findById(serverId);
    return server ? resolveServerGameVersion(this.registry, server) : undefined;
  }

  private engine(kind: ContentKind): PluginsService | ModsService {
    return kind === "plugin" ? this.plugins : this.mods;
  }
}
