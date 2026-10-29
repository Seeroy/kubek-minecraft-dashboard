import { ConfigRepository } from "@/modules/database/repositories/config.repository";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "crypto";
import Docker from "dockerode";
import os from "os";
import path from "path";
import type { ContainerRow } from "./container-reconcile";
import {
  isInsideContainer,
  mapByHostDataDir,
  mapByMounts,
  ownContainerId,
  type PanelMount,
} from "./host-paths";

/** TTL for the cached ping result */
const AVAILABILITY_TTL_MS = 30_000;

/** config_kv key for this panel's container id */
const PANEL_ID_KEY = "dockerPanelId";

/** How panel paths become paths the daemon can bind */
type HostMapping =
  | { kind: "same" }
  | { kind: "env"; hostDir: string }
  | { kind: "mounts"; mounts: PanelMount[] }
  | { kind: "unresolved"; reason: string };

/**
 * Single owner of the dockerode client
 */
@Injectable()
export class DockerService implements OnModuleInit {
  private readonly logger = new Logger(DockerService.name);
  private readonly docker = new Docker();
  private availability?: { ok: boolean; at: number };
  private mapping?: HostMapping;
  private cachedPanelId?: string;

  constructor(private readonly config: ConfigRepository) {}

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
    let ok: boolean;
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

  /** Id of this panel install, kept in config_kv */
  panelId(): string {
    if (this.cachedPanelId) return this.cachedPanelId;
    const stored: unknown = this.config.get(PANEL_ID_KEY);
    if (typeof stored === "string" && stored) {
      this.cachedPanelId = stored;
    } else {
      this.cachedPanelId = randomUUID();
      this.config.set(PANEL_ID_KEY, this.cachedPanelId);
    }
    return this.cachedPanelId;
  }

  /** All containers, only the fields reconcile needs */
  async listContainerRows(): Promise<ContainerRow[]> {
    const containers = await this.docker.listContainers({ all: true });
    return containers.map((c) => ({
      id: c.Id,
      names: c.Names ?? [],
      state: c.State,
      labels: c.Labels ?? {},
      mounts: (c.Mounts ?? []).map((m) => ({
        Source: m.Source,
        Destination: m.Destination,
      })),
    }));
  }

  /** Force remove, ok if it's already gone */
  async removeContainer(id: string): Promise<void> {
    try {
      await this.docker.getContainer(id).remove({ force: true });
    } catch {
      // already gone or being removed
    }
  }

  /**
   * Path the daemon should bind for a panel folder. As is on the host, through
   * KUBEK_HOST_DATA_DIR or our container mounts when the panel is in docker
   */
  async toHostPath(localPath: string): Promise<string> {
    const local = path.resolve(localPath);
    const mapping = await this.hostMapping();
    switch (mapping.kind) {
      case "same":
        return local;
      case "env": {
        const mapped = mapByHostDataDir(local, process.cwd(), mapping.hostDir);
        if (mapped) return mapped;
        throw new Error(
          `${local} is outside the panel data folder, KUBEK_HOST_DATA_DIR cannot map it`,
        );
      }
      case "mounts": {
        const mapped = mapByMounts(local, mapping.mounts);
        if (mapped) return mapped;
        throw new Error(
          `The panel runs in a container and ${local} is not on a volume or bind mount. ` +
            `Mount the data folder from the host or set KUBEK_HOST_DATA_DIR`,
        );
      }
      case "unresolved":
        throw new Error(mapping.reason);
    }
  }

  private async hostMapping(): Promise<HostMapping> {
    if (this.mapping) return this.mapping;
    const mapping = await this.detectHostMapping();
    // Don't cache a daemon hiccup
    if (mapping.kind !== "unresolved") this.mapping = mapping;
    return mapping;
  }

  private async detectHostMapping(): Promise<HostMapping> {
    const hostDir = process.env.KUBEK_HOST_DATA_DIR?.trim();
    if (hostDir) return { kind: "env", hostDir };
    if (!isInsideContainer()) return { kind: "same" };

    const ids = [os.hostname(), ownContainerId()].filter(
      (id): id is string => !!id,
    );
    for (const id of ids) {
      try {
        const info = await this.docker.getContainer(id).inspect();
        const mounts = (info.Mounts ?? []).map((m) => ({
          Source: m.Source,
          Destination: m.Destination,
        }));
        this.logger.log(
          `Panel container ${info.Name}, mapping data through its mounts`,
        );
        return { kind: "mounts", mounts };
      } catch {
        // hostname may be custom, try the next candidate
      }
    }
    return {
      kind: "unresolved",
      reason:
        "The panel runs in a container but could not inspect it to find where its data lives on the host. " +
        "Set KUBEK_HOST_DATA_DIR to the host folder mounted as the panel working dir",
    };
  }

  getDocker(): Docker {
    return this.docker;
  }
}
