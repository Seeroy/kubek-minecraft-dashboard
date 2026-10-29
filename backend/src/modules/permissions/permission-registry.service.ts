import { Injectable, Logger } from "@nestjs/common";
import { isLegacyPermission } from "@shared/access/legacy";

export interface PermissionDef {
  key: string;
  label: string;
  group?: string;
  /** Extension id that declares it */
  source: string;
}

/** Permissions declared by extensions, core access lives in areas */
@Injectable()
export class PermissionRegistry {
  private readonly logger = new Logger(PermissionRegistry.name);
  private readonly defs = new Map<string, PermissionDef>();

  /** Register permissions declared by an extension. Throws on collision with an existing key */
  register(
    extId: string,
    defs: Array<{ key: string; label: string; group?: string }>,
  ): void {
    for (const def of defs) {
      // Old core keys are still checked by extensions, so none may redeclare them
      if (isLegacyPermission(def.key)) {
        throw new Error(
          `Permission "${def.key}" is a core permission, cannot be redeclared by "${extId}"`,
        );
      }
      const existing = this.defs.get(def.key);
      if (existing && existing.source !== extId) {
        throw new Error(
          `Permission "${def.key}" already declared by "${existing.source}", cannot be redeclared by "${extId}"`,
        );
      }
    }
    for (const def of defs) {
      this.defs.set(def.key, { ...def, source: extId });
    }
    this.logger.log(`Registered ${defs.length} permission(s) from "${extId}"`);
  }

  /** Drop all permissions declared by an extension (on disable/uninstall) */
  unregister(extId: string): void {
    for (const [key, def] of this.defs) {
      if (def.source === extId) this.defs.delete(key);
    }
  }

  has(key: string): boolean {
    return this.defs.has(key);
  }

  list(): PermissionDef[] {
    return [...this.defs.values()];
  }
}
