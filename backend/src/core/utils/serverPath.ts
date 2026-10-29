import { isInside, isRealInside } from "@/core/utils/paths";
import { BadRequestException } from "@nestjs/common";
import { existsSync, realpathSync } from "fs";
import { join, normalize, resolve } from "path";

// Get server directory by id
export const getServerPath = (serverId: string) => {
  return `./servers/${serverId}`;
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

  if (!isInside(base, full)) {
    throw new BadRequestException(
      "Invalid path: directory traversal attempt detected",
    );
  }

  return full;
}

const traversal = () =>
  new BadRequestException("Invalid path: directory traversal attempt detected");

// realpath on top, so links planted by the server can't leave its dir
// a missing path is checked by its closest existing parent
export async function getRealServerPath(
  serverId: string,
  requestedPath = "",
): Promise<string> {
  const full = getSafeServerPath(serverId, requestedPath);
  const base = getSafeServerPath(serverId);
  // A folder that doesn't exist yet can't link anywhere
  if (!existsSync(base)) return full;
  if (!(await isRealInside(base, full, true))) throw traversal();
  return full;
}

// Sync realpath of an existing file, null when it's missing
export function getRealServerFileSync(
  serverId: string,
  requestedPath: string,
): string | null {
  const full = getSafeServerPath(serverId, requestedPath);
  let real: string;
  try {
    real = realpathSync(full);
  } catch {
    return null;
  }
  if (!isInside(realpathSync(getSafeServerPath(serverId)), real)) {
    throw traversal();
  }
  return real;
}

// File names from remote APIs must stay a single plain path segment
export function assertSafeFileName(name: string): string {
  if (
    !name ||
    name === "." ||
    name === ".." ||
    /[\\/\0:]/.test(name) ||
    name.length > 255
  ) {
    throw new BadRequestException(`Unsafe file name: ${name}`);
  }
  return name;
}

// Path of a file inside a server content folder (plugins, mods)
export function getServerContentPath(
  serverId: string,
  folder: string,
  fileName: string,
): string {
  return getSafeServerPath(
    serverId,
    join(folder, assertSafeFileName(fileName)),
  );
}
