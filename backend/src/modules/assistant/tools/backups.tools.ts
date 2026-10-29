import { BackupCreatorService } from "@/modules/backups/backup-creator.service";
import { BackupsService } from "@/modules/backups/backups.service";
import { Injectable } from "@nestjs/common";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import { BackupType } from "@shared/types/backup.types";
import { AccessArea } from "@shared/access/areas";
import { z } from "zod";
import { json, serverArgs, text } from "./tool-args";
import { type AssistantTool, type ToolGroup, defineTool } from "./tool.types";

@Injectable()
export class BackupsTools implements ToolGroup {
  constructor(
    private readonly backups: BackupsService,
    private readonly creator: BackupCreatorService,
  ) {}

  tools(): AssistantTool[] {
    return [this.listBackups(), this.createBackup()];
  }

  private listBackups() {
    return defineTool({
      name: "list_backups",
      description: "Backups of a server, newest first",
      kind: "read",
      access: [AccessArea.BACKUPS, "read"],
      serverScoped: true,
      args: serverArgs({}),
      run: (_ctx, { serverId }) =>
        Promise.resolve(
          json(
            this.backups
              .findByServerId(serverId)
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 50)
              .map((b) => ({
                name: b.name,
                status: b.status,
                type: b.type,
                createdAt: new Date(b.createdAt).toISOString(),
                sizeMb: Math.round(b.totalSize / 1024 / 1024),
                pinned: b.pinned,
                copies: b.copies.map((c) => c.storageId ?? "local"),
              })),
          ),
        ),
    });
  }

  private createBackup() {
    return defineTool({
      name: "create_backup",
      description: "Create a full backup of a server",
      kind: "write",
      access: [AccessArea.BACKUPS, "write"],
      serverScoped: true,
      args: serverArgs({
        name: z
          .string()
          .min(1)
          .max(100)
          .regex(
            /^[a-zA-Z0-9._\-\s]+$/,
            "Latin letters, digits, . _ - and spaces",
          ),
        description: z.string().max(200).optional(),
      }),
      preview: (_ctx, { name }) =>
        Promise.resolve({
          type: "summary",
          title: `Full backup "${name}"`,
          lines: [],
        }),
      run: ({ user }, { serverId, name, description }) => {
        const { taskId } = this.creator.create(
          { serverId, name, description, type: BackupType.FULL },
          user.id,
        );
        return Promise.resolve(text(`Backup started, task ${taskId}`));
      },
      audit: ({ name }) => ({
        action: AuditAction.BACKUP_CREATE,
        category: AuditCategory.SERVER,
        resourceName: name,
      }),
    });
  }
}
