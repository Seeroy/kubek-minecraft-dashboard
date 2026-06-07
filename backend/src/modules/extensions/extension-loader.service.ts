import { safeId } from "@/core/utils/safeId";
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
  /** Absolute directory an extension lives in */
  dir(extId: string): string {
    return join(EXT_ROOT, safeId(extId));
  }

  async load(extId: string, entry: string): Promise<KubekBackendModule> {
    const file = join(this.dir(extId), entry);
    if (!existsSync(file)) throw new Error(`backend entry not found: ${entry}`);

    // cache-bust so a reinstalled extension re-imports fresh
    const imported = await import(`${file}?t=${this.token(extId)}`);
    const mod = imported.default ?? imported;
    if (typeof mod.activate !== "function") {
      throw new Error("backend entry must export an activate(ctx) function");
    }
    return { activate: mod.activate, deactivate: mod.deactivate };
  }

  /** Stable per-extension import token so repeated loads in one boot share a module instance */
  private token(extId: string): string {
    return safeId(extId);
  }
}
