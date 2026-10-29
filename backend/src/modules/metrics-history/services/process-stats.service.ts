import { ConfigService } from "@/modules/config/config.service";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import type { ServerInstance } from "@/modules/instances/instance";
import { Injectable, Logger } from "@nestjs/common";
import { availableParallelism } from "node:os";
import {
  fillRss,
  processTree,
  readProcessTable,
  type ProcessTable,
} from "./process-table";

export interface ProcessStats {
  serverId: string;
  /** Host pid of the heaviest process in the tree, none for containers */
  pid: number | null;
  /** Share of the whole host, 0..100 */
  cpu: number | null;
  memoryBytes: number;
  memoryLimitBytes: number | null;
  startedAt: string | null;
}

// Requests inside this window share one sample
const FRESH_MS = 3_000;
// Gap for the first CPU delta when a server has no previous sample
const WARMUP_MS = 1_000;
// An older sample would average CPU over the time nobody was watching
const STALE_MS = 30_000;

interface CpuSample {
  root: number;
  cpuMs: number;
  at: number;
}

@Injectable()
export class ProcessStatsService {
  private readonly logger = new Logger(ProcessStatsService.name);
  private readonly cores = availableParallelism();
  private readonly previous = new Map<string, CpuSample>();
  private cache?: { at: number; stats: ProcessStats[] };
  private inFlight?: Promise<ProcessStats[]>;

  constructor(
    private readonly instances: InstancesRegistry,
    private readonly config: ConfigService,
  ) {}

  /** Off by the panel setting or KUBEK_SERVER_STATS=off for weak hosts */
  isEnabled(): boolean {
    if ((process.env.KUBEK_SERVER_STATS ?? "").toLowerCase() === "off")
      return false;
    return this.config.get("serverStats")?.enabled !== false;
  }

  /** Stats of every running server, sampled on demand */
  collect(): Promise<ProcessStats[]> {
    if (!this.isEnabled()) return Promise.resolve([]);
    if (this.cache && Date.now() - this.cache.at < FRESH_MS) {
      return Promise.resolve(this.cache.stats);
    }
    this.inFlight ??= this.sample()
      .then((stats) => {
        this.cache = { at: Date.now(), stats };
        return stats;
      })
      .finally(() => {
        this.inFlight = undefined;
      });
    return this.inFlight;
  }

  private async sample(): Promise<ProcessStats[]> {
    const running = this.instances.findAll().filter((i) => i.isRunning());
    const native = running.filter((i) => !i.hasRuntimeStats() && i.pid != null);
    const containers = running.filter((i) => i.hasRuntimeStats());

    const [nativeStats, containerStats] = await Promise.all([
      this.sampleNative(native),
      Promise.all(containers.map((i) => this.sampleContainer(i))),
    ]);

    // Forget servers that stopped so a restart starts a fresh delta
    const alive = new Set(running.map((i) => i.serverId));
    for (const id of this.previous.keys()) {
      if (!alive.has(id)) this.previous.delete(id);
    }

    return [...nativeStats, ...containerStats.filter((s) => s != null)];
  }

  private async sampleNative(instances: ServerInstance[]): Promise<ProcessStats[]> {
    if (instances.length === 0) return [];

    let table: ProcessTable;
    try {
      table = await readProcessTable();
      const cold = instances.some((i) => !this.usable(i, Date.now()));
      if (cold) {
        this.remember(instances, table, Date.now());
        await new Promise((resolve) => setTimeout(resolve, WARMUP_MS));
        table = await readProcessTable();
      }
    } catch (e) {
      this.logger.warn(`process table read failed: ${(e as Error).message}`);
      return [];
    }

    const now = Date.now();
    const trees = new Map(
      instances.map((i) => [i.serverId, processTree(table, i.pid!)]),
    );
    await fillRss(table, [...trees.values()].flat());

    const stats: ProcessStats[] = [];
    for (const instance of instances) {
      const tree = trees.get(instance.serverId)!;
      if (tree.length === 0) continue;

      const cpuMs = tree.reduce((sum, pid) => sum + table.get(pid)!.cpuMs, 0);
      const prev = this.previous.get(instance.serverId);
      const cpu =
        prev && this.usable(instance, now) && now > prev.at
          ? clampPercent(
              ((cpuMs - prev.cpuMs) / ((now - prev.at) * this.cores)) * 100,
            )
          : null;

      // The wrapper shell is tiny, the heaviest process is the server itself
      const heaviest = tree.reduce((best, pid) =>
        table.get(pid)!.rssBytes > table.get(best)!.rssBytes ? pid : best,
      );

      stats.push({
        serverId: instance.serverId,
        pid: heaviest,
        cpu,
        memoryBytes: tree.reduce((sum, pid) => sum + table.get(pid)!.rssBytes, 0),
        memoryLimitBytes: limitBytes(instance),
        startedAt: instance.startedAt ?? null,
      });
    }
    this.remember(instances, table, now);
    return stats;
  }

  /** A previous sample of the same process that is recent enough for a delta */
  private usable(instance: ServerInstance, now: number): boolean {
    const prev = this.previous.get(instance.serverId);
    return !!prev && prev.root === instance.pid && now - prev.at < STALE_MS;
  }

  private remember(instances: ServerInstance[], table: ProcessTable, at: number): void {
    for (const instance of instances) {
      const tree = processTree(table, instance.pid!);
      if (tree.length === 0) continue;
      this.previous.set(instance.serverId, {
        root: instance.pid!,
        cpuMs: tree.reduce((sum, pid) => sum + table.get(pid)!.cpuMs, 0),
        at,
      });
    }
  }

  private async sampleContainer(instance: ServerInstance): Promise<ProcessStats | null> {
    try {
      const usage = await instance.runtimeStats();
      if (!usage) return null;
      return {
        serverId: instance.serverId,
        pid: null,
        cpu: clampPercent(usage.cpu),
        memoryBytes: usage.memory,
        memoryLimitBytes: limitBytes(instance),
        startedAt: instance.startedAt ?? null,
      };
    } catch (e) {
      this.logger.warn(
        `container stats failed for ${instance.serverId}: ${(e as Error).message}`,
      );
      return null;
    }
  }
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const limitBytes = (instance: ServerInstance) =>
  instance.memoryLimitMb ? instance.memoryLimitMb * 1024 * 1024 : null;
