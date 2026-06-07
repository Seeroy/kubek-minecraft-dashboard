import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { UserPermissions } from "@shared/types/user.types";

export interface PermissionDef {
  key: string;
  label: string;
  group?: string;
  /** "core" for built-in permissions, otherwise the extension id that declares it */
  source: "core" | (string & {});
}

/**
 * Core permissions registry
 */
@Injectable()
export class PermissionRegistry implements OnModuleInit {
  private readonly logger = new Logger(PermissionRegistry.name);
  private readonly defs = new Map<string, PermissionDef>();

  onModuleInit(): void {
    this.registerCore();
  }

  /** Seed built-in permissions from the UserPermissions enum */
  private registerCore(): void {
    for (const [name, key] of Object.entries(UserPermissions)) {
      this.defs.set(key, { key, label: name, group: "core", source: "core" });
    }
  }

  /** Register permissions declared by an extension. Throws on collision with an existing key */
  register(
    extId: string,
    defs: Array<{ key: string; label: string; group?: string }>,
  ): void {
    for (const def of defs) {
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
