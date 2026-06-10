import { DockerService } from "@/modules/server-types/runtime/docker.service";
import { Injectable } from "@nestjs/common";
import { exec } from "child_process";
import * as os from "os";
import osutils from "os-utils";
import { publicIpv4 } from "public-ip";
import { promisify } from "util";
import { DiskInfoDto } from "./dto/disk-info.dto";
import { NetworkInfoDto } from "./dto/network-info.dto";

const execAsync = promisify(exec);

@Injectable()
export class SystemMonitoringService {
  constructor(private readonly dockerService: DockerService) {}

  // Cache public IP
  private publicIpCache: { value: string | null; fetchedAt: number } | null =
    null;
  private publicIpInflight: Promise<string | null> | null = null;
  private readonly PUBLIC_IP_TTL_MS = 5 * 60 * 1000;

  /**
   * Collect local (private) IPv4 addresses from network interfaces,
   * filtering out loopback/internal entries
   */
  private getPrivateIps(): string[] {
    const interfaces = os.networkInterfaces();
    const result: string[] = [];
    for (const net of Object.values(interfaces)) {
      if (!net) continue;
      for (const item of net) {
        if (item.family === "IPv4" && !item.internal) {
          result.push(item.address);
        }
      }
    }
    return result;
  }

  /**
   * Resolve public IPv4 with caching and request de-duplication
   */
  private async getPublicIp(): Promise<string | null> {
    const now = Date.now();
    if (
      this.publicIpCache &&
      now - this.publicIpCache.fetchedAt < this.PUBLIC_IP_TTL_MS
    ) {
      return this.publicIpCache.value;
    }
    if (this.publicIpInflight) return this.publicIpInflight;

    this.publicIpInflight = (async () => {
      try {
        const ip = await publicIpv4({ timeout: 3000, onlyHttps: true });
        this.publicIpCache = { value: ip, fetchedAt: Date.now() };
        return ip;
      } catch {
        this.publicIpCache = { value: null, fetchedAt: Date.now() };
        return null;
      } finally {
        this.publicIpInflight = null;
      }
    })();

    return this.publicIpInflight;
  }

  async getNetworkInfo(): Promise<NetworkInfoDto> {
    const [publicIp] = await Promise.all([this.getPublicIp()]);
    return {
      publicIp,
      privateIps: this.getPrivateIps(),
    };
  }

  async getDiskInfo(): Promise<DiskInfoDto[]> {
    // Use OS shell tools instead of a native package
    return os.platform() === "win32"
      ? this.getWindowsDiskInfo()
      : this.getPosixDiskInfo();
  }

  /**
   * Enumerate real filesystems on macOS/Linux via df
   */
  private async getPosixDiskInfo(): Promise<DiskInfoDto[]> {
    // Filesystem  1024-blocks  Used  Available  Capacity  Mounted-on
    const { stdout } = await execAsync("df -kP");
    const results: DiskInfoDto[] = [];

    for (const line of stdout.trim().split("\n").slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) continue;

      const filesystem = parts[0];
      const totalKb = Number(parts[1]);
      const usedKb = Number(parts[2]);
      const availableKb = Number(parts[3]);
      // Mount path is the remainder - it may contain spaces
      const mount = parts.slice(5).join(" ");

      // Keep only real block devices, skip pseudo/virtual filesystems
      if (!totalKb || !filesystem.startsWith("/dev/")) continue;

      // Fix macOS exposes several APFS system volumes
      if (
        process.platform === "darwin" &&
        /^\/System\/Volumes\/(VM|Preboot|Update|xarts|iSCPreboot|Hardware|Recovery)$/.test(
          mount,
        )
      ) {
        continue;
      }

      const total = totalKb * 1024;
      const used = usedKb * 1024;
      const available = availableKb * 1024;
      results.push({
        mount,
        type: filesystem,
        total,
        used,
        available,
        percentage: total > 0 ? (used / total) * 100 : 0,
      });
    }

    return results;
  }

  /**
   * Enumerate logical drives on Windows
   */
  private async getWindowsDiskInfo(): Promise<DiskInfoDto[]> {
    const cmd =
      'powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk | ' +
      'Select-Object DeviceID,Size,FreeSpace,DriveType | ConvertTo-Json -Compress"';
    const { stdout } = await execAsync(cmd, { windowsHide: true });

    const raw = JSON.parse(stdout.trim() || "null");
    const disks = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const results: DiskInfoDto[] = [];

    for (const d of disks) {
      const total = Number(d.Size) || 0;
      if (!total) continue; // skip drives with no media (empty CD/removable)

      const available = Number(d.FreeSpace) || 0;
      const used = total - available;
      results.push({
        mount: d.DeviceID, // e.g. "C:"
        type: this.windowsDriveType(Number(d.DriveType)),
        total,
        used,
        available,
        percentage: total > 0 ? (used / total) * 100 : 0,
      });
    }

    return results;
  }

  private windowsDriveType(type: number): string {
    switch (type) {
      case 2:
        return "Removable";
      case 3:
        return "Local Disk";
      case 4:
        return "Network";
      case 5:
        return "CD-ROM";
      case 6:
        return "RAM Disk";
      default:
        return "Unknown";
    }
  }

  /**
   * Get hardware resource usage
   * @returns Resource usage information
   */
  async getResourcesUsage(): Promise<{
    cpu: number;
    memory: { total: number; free: number };
  }> {
    return new Promise((resolve) => {
      osutils.cpuUsage((cpu) => {
        return resolve({
          cpu: Math.round(cpu * 100),
          memory: {
            total: os.totalmem(),
            free: os.freemem(),
          },
        });
      });
    });
  }

  /**
   * Get hardware information
   * @returns Hardware information
   */
  getHardwareInfo(): {
    platform: string;
    arch: string;
    cpus: string[];
    totalMem: number;
    hostname: string;
    release: string;
    uptime: number;
    dockerAvailable: boolean;
  } {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().map((cpu) => cpu.model),
      totalMem: os.totalmem(),
      hostname: os.hostname(),
      release: os.release(),
      uptime: os.uptime(),
      dockerAvailable: this.dockerService.available(),
    };
  }

  /**
   * Calculate RAM usage from memory info
   * @param memory - Memory information
   * @returns RAM usage details
   */
  calculateRamUsage(memory: { total: number; free: number }): {
    total: number;
    used: number;
    available: number;
    percentage: number;
  } {
    const used = memory.total - memory.free;
    const percentage = (used / memory.total) * 100;
    return {
      total: memory.total,
      used,
      available: memory.free,
      percentage,
    };
  }
}
