import { safeId } from "@/core/utils/safeId";
import { isInside } from "@/core/utils/paths";
import { Injectable } from "@nestjs/common";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { KubekBackendModule } from "./extensions.types";

const EXT_ROOT = resolve("extensions");

/**
 * Imports the backend of extension from disk. Bun executes TypeScript directly, so the
 * manifest entry is imported as-is
 */
@Injectable()
export class ExtensionLoader {
  root = EXT_ROOT;

  /** Absolute directory an extension lives in */
  dir(extId: string): string {
    return join(this.root, safeId(extId));
  }

  /** The token changes per install, so an update imports fresh code and the same install reuses it */
  async load(extId: string, entry: string, token?: string): Promise<KubekBackendModule> {
    const file = join(this.dir(extId), entry);
    if (!existsSync(file)) throw new Error(`backend entry not found: ${entry}`);

    const imported = await import(`${file}?t=${encodeURIComponent(token ?? safeId(extId))}`);
    const mod = imported.default ?? imported;
    if (typeof mod.activate !== "function") {
      throw new Error("backend entry must export an activate(ctx) function");
    }
    return { activate: mod.activate, deactivate: mod.deactivate };
  }

  /** Drops cached modules of the extension, files the entry imports would stay stale otherwise */
  forget(extId: string): void {
    const dir = this.dir(extId);
    for (const key of Object.keys(require.cache)) {
      const path = key.split("?")[0];
      if (isInside(dir, path)) delete require.cache[key];
    }
  }
}
