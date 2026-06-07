import type { IConfiguration } from "@/core/types/config";
import { ConfigRepository } from "@/modules/database/repositories/config.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ConfigService {
  constructor(private readonly repo: ConfigRepository) {}

  getAll(): IConfiguration {
    return this.repo.getAll();
  }

  get<K extends keyof IConfiguration>(key: K): IConfiguration[K] {
    return this.repo.get(key);
  }

  set<K extends keyof IConfiguration>(key: K, value: IConfiguration[K]): void {
    this.repo.set(key, value);
  }

  setAll(config: Partial<IConfiguration>): IConfiguration {
    return this.repo.updateAll(config);
  }

  updateAll(config: Partial<IConfiguration>): IConfiguration {
    return this.repo.updateAll(config);
  }
}
