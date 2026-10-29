import { getErrorMessage } from "@/core/utils/error";
import { getServerPath } from "@/core/utils/serverPath";
import { stopTimeoutSec } from "@/core/utils/stopTimeout";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { ServerInstanceFactory } from "@/modules/instances/server-instance.factory";
import { reconcileContainers } from "@/modules/server-types/runtime/container-reconcile";
import { DockerService } from "@/modules/server-types/runtime/docker.service";
import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { IServer, ServerStatus } from "@shared/types/server/server.types";

// Server state across panel restarts: stale statuses, leftover containers, shutdown stops
@Injectable()
export class ServerBootService
  implements OnModuleInit, BeforeApplicationShutdown
{
  private readonly logger = new Logger(ServerBootService.name);
  private ready: Promise<void> = Promise.resolve();

  constructor(
    private readonly serversRepo: ServersRepository,
    private readonly instancesRepo: InstancesRegistry,
    private readonly instanceFactory: ServerInstanceFactory,
    private readonly dockerService: DockerService,
  ) {}

  // Resolves once boot reconcile is done, never rejects
  get containersReady(): Promise<void> {
    return this.ready;
  }

  /**
   * On module initialization, set all servers to stopped status, a crash stays visible
   */
  onModuleInit() {
    const servers = this.serversRepo.findAll();
    servers.forEach((server) => {
      if (
        server.status !== ServerStatus.STOPPED &&
        server.status !== ServerStatus.CRASHED
      ) {
        this.serversRepo.update(server.id, {
          status: ServerStatus.STOPPED,
        });
      }
    });

    // Pick up containers from the last run, start waits for it
    this.ready = this.reconcileContainers().catch((e: unknown) => {
      this.logger.warn(`Container reconcile failed: ${getErrorMessage(e)}`);
    });
  }

  /**
   * Adopt our running containers and remove our stopped ones
   * Anything we're not sure about stays
   */
  private async reconcileContainers(): Promise<void> {
    if (!(await this.dockerService.isAvailable())) return;

    const servers = this.serversRepo.findAll();
    const dirs = new Map<string, string>();
    try {
      for (const server of servers) {
        dirs.set(
          server.id,
          await this.dockerService.toHostPath(getServerPath(server.id)),
        );
      }
    } catch (e: unknown) {
      // No host paths, can't tell what's ours, so touch nothing
      this.logger.warn(`Skipping container reconcile: ${getErrorMessage(e)}`);
      return;
    }

    const actions = reconcileContainers(
      await this.dockerService.listContainerRows(),
      this.dockerService.panelId(),
      dirs,
    );
    for (const action of actions) {
      const server = servers.find((s) => s.id === action.serverId);
      const label = server?.name ?? action.serverId;
      if (action.kind === "remove") {
        await this.dockerService.removeContainer(action.containerId);
        continue;
      }
      if (action.kind === "skip") {
        this.logger.warn(
          `Leaving container ${action.containerId.slice(0, 12)} of ${label} alone: ${action.reason}`,
        );
        continue;
      }
      try {
        await this.ensureInstance(server!).adopt(action.containerId);
        this.logger.log(`Reattached to the running container of ${label}`);
      } catch (e: unknown) {
        this.logger.warn(
          `Could not reattach to ${label}, the container keeps running: ${getErrorMessage(e)}`,
        );
      }
    }
  }

  private ensureInstance(server: IServer) {
    const existing = this.instancesRepo.getByServerId(server.id);
    if (existing) return existing;
    return this.instancesRepo.add(this.instanceFactory.create(server));
  }

  /**
   * Stop native servers on exit so worlds get saved
   * Containers keep running and get adopted on next boot
   */
  async beforeApplicationShutdown(): Promise<void> {
    const running = this.instancesRepo
      .findAll()
      .filter((instance) => instance.isRunning() && !instance.isDocker());
    if (!running.length) return;

    this.logger.log(`Stopping ${running.length} server(s) before exit`);
    // Each stop kills on its own, this is just in case a kill hangs
    const budgetMs = (stopTimeoutSec() + 10) * 1000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      Promise.allSettled(running.map((instance) => instance.stopForShutdown())),
      new Promise((resolve) => {
        timer = setTimeout(resolve, budgetMs);
      }),
    ]);
    clearTimeout(timer);
  }
}
