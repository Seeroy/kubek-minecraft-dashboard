import { getErrorMessage } from "@/core/utils/error";
import {
  getRealServerFileSync,
  getRealServerPath,
} from "@/core/utils/serverPath";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import fs from "fs";
import { Jimp } from "jimp";

const ICON_FILE = "server-icon.png";

/** server-icon.png the game shows in the server list */
@Injectable()
export class ServerIconService {
  constructor(private readonly serversRepo: ServersRepository) {}

  /** Icon path in the server folder, null if there's none */
  iconPath(serverId: string): string | null {
    // The server can swap the icon for a link to any file
    return getRealServerFileSync(serverId, ICON_FILE);
  }

  /**
   * Upload and convert server icon to 64x64 PNG
   */
  async upload(serverId: string, file: Express.Multer.File): Promise<void> {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const iconPath = await getRealServerPath(serverId, ICON_FILE);

    try {
      // Convert and resize image to 64x64 PNG (cover = crop to fill, centered)
      const image = await Jimp.read(file.buffer);
      image.cover({ w: 64, h: 64 });
      const buffer = await image.getBuffer("image/png");
      fs.writeFileSync(iconPath, buffer);
    } catch (error: unknown) {
      throw new BadRequestException(
        `Failed to process icon: ${getErrorMessage(error)}`,
      );
    }
  }
}
