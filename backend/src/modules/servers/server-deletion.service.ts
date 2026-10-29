import { AppEventsService } from "@/core/events/app-events.service";
import { getErrorMessage } from "@/core/utils/error";
import { canAccessServer } from "@/core/utils/serverAccess";
import { getServerPath } from "@/core/utils/serverPath";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { PasswordRecheckService } from "@/modules/rate-limit/password-recheck.service";
import { ServersFactory } from "@/modules/servers/servers.factory";
import type { BulkDeleteResult } from "@/modules/servers/servers.types";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IUser } from "@shared/types/user.types";
import fs from "fs";

@Injectable()
export class ServerDeletionService {
  constructor(
    private readonly serversRepo: ServersRepository,
    private readonly instancesRepo: InstancesRegistry,
    private readonly serversFactory: ServersFactory,
    private readonly passwordRecheck: PasswordRecheckService,
    private readonly events: AppEventsService,
  ) {}

  private async tearDownInstance(serverId: string): Promise<void> {
    const instance = this.instancesRepo.getByServerId(serverId);
    if (!instance) return;
    try {
      await instance.kill();
    } catch {
      // ignore: process may already be dead
    }
    this.instancesRepo.delete(serverId);
  }

  /**
   * Delete server permanently after verifying user password and confirmation name
   */
  async delete(
    serverId: string,
    user: IUser,
    password: string,
    confirmName: string,
  ): Promise<void> {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    if (server.name !== confirmName) {
      throw new BadRequestException("NAME_MISMATCH");
    }

    await this.passwordRecheck.assert(user, password);

    await this.tearDownInstance(serverId);

    const dir = getServerPath(serverId);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e: unknown) {
      throw new BadRequestException(
        `Failed to remove server files: ${getErrorMessage(e)}`,
      );
    }

    this.serversRepo.delete(serverId);
    this.events.emit("server.deleted", { serverId });
    this.serversFactory.broadcastServersList();
  }

  /**
   * Delete multiple servers atomically (after a single password check)
   * Returns lists of successfully deleted and failed server IDs
   */
  async bulkDelete(
    ids: string[],
    user: IUser,
    password: string,
  ): Promise<BulkDeleteResult> {
    await this.passwordRecheck.assert(user, password);

    const deleted: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const id of ids) {
      const server = this.serversRepo.findById(id);
      if (!server) {
        failed.push({ id, reason: "NOT_FOUND" });
        continue;
      }
      if (!canAccessServer(user, id)) {
        failed.push({ id, reason: "FORBIDDEN" });
        continue;
      }
      try {
        await this.tearDownInstance(id);
        fs.rmSync(getServerPath(id), { recursive: true, force: true });
        this.serversRepo.delete(id);
        this.events.emit("server.deleted", { serverId: id });
        deleted.push(id);
      } catch (e: unknown) {
        failed.push({ id, reason: getErrorMessage(e) });
      }
    }

    if (deleted.length > 0) this.serversFactory.broadcastServersList();
    return { deleted, failed };
  }
}
