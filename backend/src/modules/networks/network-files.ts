import { writeFileAtomic } from "@/core/utils/atomicWrite";
import { getRealServerPath } from "@/core/utils/serverPath";
import { promises as fs } from "fs";
import { dirname } from "path";
import { FORWARDING_SECRET_FILE } from "./config/velocity-configurator";
import type { FileEdit, ServerFiles } from "./forwarding/backend-forwarding";

export function serverFiles(serverId: string | null): ServerFiles {
  return {
    read: async (path) => {
      if (!serverId) return null;
      try {
        return await fs.readFile(
          await getRealServerPath(serverId, path),
          "utf8",
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
  };
}

export async function writeEdits(
  serverId: string,
  edits: FileEdit[],
): Promise<void> {
  for (const edit of edits) {
    const file = await getRealServerPath(serverId, edit.path);
    await fs.mkdir(dirname(file), { recursive: true });
    await writeFileAtomic(file, edit.after);
  }
}

/** forwarding.secret of a proxy, empty when there is none yet */
export async function readSecret(proxyId: string): Promise<string> {
  const text = await serverFiles(proxyId).read(FORWARDING_SECRET_FILE);
  return text?.trim() ?? "";
}
