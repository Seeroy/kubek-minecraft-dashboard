import { ServersService } from "@/modules/servers/servers.service";
import { Injectable } from "@nestjs/common";
import type { AssistantPropertyChange } from "@shared/types/assistant.types";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import { AccessArea } from "@shared/access/areas";
import { z } from "zod";
import { containsRedaction } from "./file-edits";
import { json, serverArgs, text } from "./tool-args";
import { type AssistantTool, type ToolGroup, defineTool } from "./tool.types";

const setArgs = serverArgs({
  changes: z
    .record(
      z.string().regex(/^[a-z0-9.-]+$/i, "Property key"),
      z.union([z.string(), z.number(), z.boolean()]).transform(String),
    )
    .refine((changes) => Object.keys(changes).length > 0, "Nothing to change")
    .describe("Keys of server.properties and their new values"),
});

@Injectable()
export class PropertiesTools implements ToolGroup {
  constructor(private readonly servers: ServersService) {}

  tools(): AssistantTool[] {
    return [this.getProperties(), this.setProperties()];
  }

  private getProperties() {
    return defineTool({
      name: "get_properties",
      description: "Read server.properties of a server",
      kind: "read",
      access: [AccessArea.SETTINGS, "read"],
      serverScoped: true,
      args: serverArgs({}),
      run: async (_ctx, { serverId }) =>
        json(await this.servers.getServerProperties(serverId)),
    });
  }

  private setProperties() {
    return defineTool({
      name: "set_properties",
      description:
        "Change keys of server.properties, most changes apply after a restart",
      kind: "write",
      access: [AccessArea.SETTINGS, "write"],
      serverScoped: true,
      args: setArgs,
      preview: async (_ctx, { serverId, changes }) => ({
        type: "properties",
        changes: await this.diff(serverId, changes),
      }),
      run: async (_ctx, { serverId, changes }) => {
        if (Object.values(changes).some(containsRedaction)) {
          throw new Error("A value contains the [redacted] placeholder");
        }
        const current = await this.servers.getServerProperties(serverId);
        await this.servers.saveServerProperties(serverId, {
          ...current,
          ...changes,
        });
        return text("Saved, restart the server to apply");
      },
      audit: () => ({
        action: AuditAction.SERVER_PROPERTIES_UPDATE,
        category: AuditCategory.SERVER,
      }),
    });
  }

  private async diff(
    serverId: string,
    changes: Record<string, string>,
  ): Promise<AssistantPropertyChange[]> {
    const current = await this.servers.getServerProperties(serverId);
    return Object.entries(changes).map(([key, after]) => ({
      key,
      before: current[key] ?? null,
      after,
    }));
  }
}
