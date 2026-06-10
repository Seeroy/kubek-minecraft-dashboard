import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import Docker from "dockerode";

/** TTL for the cached ping result */
const AVAILABILITY_TTL_MS = 30_000;

/**
 * Single owner of the dockerode client
 */
@Injectable()
export class DockerService implements OnModuleInit {
  private readonly logger = new Logger(DockerService.name);
  private readonly docker = new Docker();
  private availability?: { ok: boolean; at: number };

  /** Warm the availability cache so synchronous callers get answer early */
  onModuleInit(): void {
    void this.isAvailable();
  }

  /** Last known availability without hitting the daemon, false until the first probe */
  available(): boolean {
    return this.availability?.ok ?? false;
  }

  /** docker.ping() with a short TTL cache so callers can probe cheaply */
  async isAvailable(): Promise<boolean> {
    const now = Date.now();
    if (this.availability && now - this.availability.at < AVAILABILITY_TTL_MS) {
      return this.availability.ok;
    }
    let ok = false;
    try {
      await this.docker.ping();
      ok = true;
    } catch {
      ok = false;
    }
    if (!this.availability || this.availability.ok !== ok) {
      this.logger.log(`Docker daemon ${ok ? "available" : "unavailable"}`);
    }
    this.availability = { ok, at: now };
    return ok;
  }

  /** Throw a clear error when a docker action is attempted without a reachable daemon */
  async assertAvailable(): Promise<void> {
    if (!(await this.isAvailable())) {
      throw new Error(
        "Docker daemon is not reachable. Start Docker or set DOCKER_HOST",
      );
    }
  }

  /** Drop the cached ping result so the next probe hits the daemon */
  refresh(): void {
    this.availability = undefined;
  }

  /**
   * Remove leftover kubek-* containers on boot. The panel cannot reattach to a container it no
   * longer tracks, so any survivor of a crash is an orphan and is force-removed
   */
  async removeOrphans(): Promise<void> {
    if (!(await this.isAvailable())) return;
    const containers = await this.docker.listContainers({
      all: true,
      filters: { name: ["kubek-"] },
    });
    for (const info of containers) {
      try {
        await this.docker.getContainer(info.Id).remove({ force: true });
      } catch {
        // already gone or being removed
      }
    }
    if (containers.length) {
      this.logger.log(`Removed ${containers.length} orphaned container(s)`);
    }
  }

  getDocker(): Docker {
    return this.docker;
  }
}
