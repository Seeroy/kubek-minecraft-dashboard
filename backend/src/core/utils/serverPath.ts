import { BadRequestException } from "@nestjs/common";
import process from "node:process";
import path, { join, normalize, resolve, sep } from "path";

// Get server directory by id
export const getServerPath = (serverId: string) => {
  return `./servers/${serverId}`;
};

// Get server startup script path by id
export const getServerLaunchConfiguration = (serverId: string) => {
  if (process.platform === "win32") {
    return [path.resolve(`./servers/${serverId}/start.bat`)];
  } else if (["linux", "darwin"].includes(process.platform)) {
    return ["sh", path.resolve(`./servers/${serverId}/start.sh`)];
  } else {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }
};

///
/// SAFE PATH RESOLUTION
///

// Validate serverId as a single path segment, then jail requestedPath under the server directory
export function getSafeServerPath(
  serverId: string,
  requestedPath = "",
): string {
  if (!serverId || /[\\/]|\.\./.test(serverId)) {
    throw new BadRequestException("Invalid server id");
  }

  const base = resolve(getServerPath(serverId));
  const full = resolve(join(base, normalize(requestedPath)));

  if (full !== base && !full.startsWith(base + sep)) {
    throw new BadRequestException(
      "Invalid path: directory traversal attempt detected",
    );
  }

  return full;
}
