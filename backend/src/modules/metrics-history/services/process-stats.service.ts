import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { Injectable, Logger } from "@nestjs/common";
import pidusage from "pidusage";

export interface ProcessStats {
  serverId: string;
  pid: number;
  cpu: number; // 0..100 (sum across logical CPUs reported by pidusage)
  memory: number; // bytes
}

@Injectable()
export class ProcessStatsService {
  private readonly logger = new Logger(ProcessStatsService.name);

  constructor(private readonly instances: InstancesRegistry) {}

  // Collect CPU/RAM stats for every running instance
  async collect(): Promise<ProcessStats[]> {
    const running = this.instances.findAll().filter((i) => i.pid != null);
    if (running.length === 0) return [];

    const pidToServerId = new Map<number, string>();
    for (const i of running) {
      if (i.pid != null) pidToServerId.set(i.pid, i.serverId);
    }
    const pids = Array.from(pidToServerId.keys());

    try {
      const result = await pidusage(pids);
      const stats: ProcessStats[] = [];
      for (const pid of pids) {
        const r = (result as Record<string, any>)[String(pid)];
        if (!r) continue;
        stats.push({
          serverId: pidToServerId.get(pid)!,
          pid,
          cpu: Math.max(0, Math.min(100, Number(r.cpu) || 0)),
          memory: Number(r.memory) || 0,
        });
      }
      return stats;
    } catch (e) {
      this.logger.warn(`pidusage batch failed: ${(e as Error).message}`);
      return [];
    }
  }
}
