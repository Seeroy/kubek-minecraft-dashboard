import { Branding } from "@/core/constants/branding";
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
import { readImageSize } from "./image-size";

const ICON_FILE = "server-icon.png";
// What installs write for new Minecraft servers
const DEFAULT_ICON = Buffer.from(Branding.Base64Icon, "base64");
// Decoding takes width * height * 4 bytes, so huge images are refused up front
const MAX_ICON_SIDE = 4096;

/** server-icon.png the game shows in the server list */
@Injectable()
export class ServerIconService {
  constructor(private readonly serversRepo: ServersRepository) {}

  /** Icon path in the server folder, null if there's none */
  iconPath(serverId: string): string | null {
    // The server can swap the icon for a link to any file
    return getRealServerFileSync(serverId, ICON_FILE);
  }

  /** Icon the owner set, through the panel or by hand, null while it's still Kubek's */
  customIconPath(serverId: string): string | null {
    const iconPath = this.iconPath(serverId);
    if (!iconPath) return null;
    try {
      // Size first, so most custom icons are never read
      if (fs.statSync(iconPath).size !== DEFAULT_ICON.length) return iconPath;
      return fs.readFileSync(iconPath).equals(DEFAULT_ICON) ? null : iconPath;
    } catch {
      return null;
    }
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

    const size = readImageSize(file.buffer);
    if (!size) {
      throw new BadRequestException(
        "Unsupported image, use PNG, JPEG, GIF, BMP or TIFF",
      );
    }
    if (size.width > MAX_ICON_SIDE || size.height > MAX_ICON_SIDE) {
      throw new BadRequestException(
        `Image is too large, max ${MAX_ICON_SIDE}x${MAX_ICON_SIDE}`,
      );
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
