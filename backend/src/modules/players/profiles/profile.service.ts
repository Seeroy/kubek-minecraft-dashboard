import { ApiErrorCode } from "@/core/errors/error-codes";
import { NetworksRepository } from "@/modules/database/repositories/networks.repository";
import {
  MojangProfileClient,
  MojangUnavailableError,
} from "@/modules/mojang/mojang-profile.client";
import { offlineUuid } from "@/modules/mojang/uuid";
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ResolvedPlayer } from "@shared/types/players.types";
import { MOJANG_NAME } from "../players.constants";
import { isBehindProxy } from "./proxy-detector";

/** Name to UUID the way the server itself would assign it */
@Injectable()
export class PlayerProfileService {
  constructor(
    private readonly mojang: MojangProfileClient,
    private readonly networks: NetworksRepository,
  ) {}

  async resolve(
    serverId: string,
    name: string,
    onlineMode: boolean,
  ): Promise<ResolvedPlayer> {
    const useMojang =
      onlineMode ||
      !!this.networks.findByServer(serverId) ||
      (await isBehindProxy(serverId));
    if (!useMojang) {
      return { name, uuid: offlineUuid(name), source: "offline" };
    }

    const profile = MOJANG_NAME.test(name) ? await this.lookup(name) : null;
    if (!profile) {
      throw new NotFoundException({
        code: ApiErrorCode.PLAYER_NOT_FOUND,
        message: `No Minecraft account named ${name}`,
      });
    }
    return { name: profile.name, uuid: profile.id, source: "mojang" };
  }

  private async lookup(name: string) {
    try {
      return await this.mojang.lookup(name);
    } catch (error) {
      if (!(error instanceof MojangUnavailableError)) throw error;
      throw new ServiceUnavailableException({
        code: ApiErrorCode.MOJANG_UNAVAILABLE,
        message: "Mojang is unreachable, try again later",
      });
    }
  }
}
