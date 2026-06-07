import { Injectable } from "@nestjs/common";
import { ServerInstance } from "./instance";

@Injectable()
export class InstancesRegistry {
  private readonly instances = new Map<string, ServerInstance>();

  findAll(): ServerInstance[] {
    return Array.from(this.instances.values());
  }

  getByServerId(serverId: string): ServerInstance | null {
    return this.instances.get(serverId) || null;
  }

  add(instance: ServerInstance): ServerInstance {
    this.instances.set(instance.serverId, instance);
    return instance;
  }

  delete(serverId: string): boolean {
    return this.instances.delete(serverId);
  }
}
