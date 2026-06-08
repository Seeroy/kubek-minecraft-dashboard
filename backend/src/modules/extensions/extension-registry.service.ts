import type { ExtCommand, ExtRoute } from "@kubekpanel/extension-sdk";
import { Injectable } from "@nestjs/common";
import type { LoadedExtension } from "./extensions.types";

/** In-memory registry of active extensions and their runtime contributions */
@Injectable()
export class ExtensionRegistry {
  private readonly loaded = new Map<string, LoadedExtension>();
  private readonly routes = new Map<string, ExtRoute[]>();
  private readonly commands = new Map<string, ExtCommand[]>();

  add(ext: LoadedExtension): void {
    this.loaded.set(ext.record.id, ext);
  }

  get(extId: string): LoadedExtension | null {
    return this.loaded.get(extId) ?? null;
  }

  list(): LoadedExtension[] {
    return [...this.loaded.values()];
  }

  isActive(extId: string): boolean {
    return this.loaded.has(extId);
  }

  /** Drop an extension and all its contributions */
  remove(extId: string): void {
    this.loaded.delete(extId);
    this.routes.delete(extId);
    this.commands.delete(extId);
  }

  setRoutes(extId: string, routes: ExtRoute[]): void {
    this.routes.set(extId, routes);
  }

  getRoutes(extId: string): ExtRoute[] {
    return this.routes.get(extId) ?? [];
  }

  addCommand(extId: string, cmd: ExtCommand): void {
    const list = this.commands.get(extId) ?? [];
    list.push(cmd);
    this.commands.set(extId, list);
  }
}
