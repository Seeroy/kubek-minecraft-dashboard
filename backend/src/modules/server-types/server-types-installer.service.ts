import { unpackArchive } from "@/core/utils/archives";
import { getErrorMessage } from "@/core/utils/error";
import { safeId } from "@/core/utils/safeId";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import fs from "fs";
import os from "os";
import { join } from "path";
import { ServerTypesRegistry } from "./server-types-registry.service";
import type { LoadedBlueprint } from "./server-types.types";

/**
 * Installs and removes user blueprints under ./blueprints. Accepts a flat .json manifest or a
 * .kbp/.zip bundle (blueprint.json + optional versions.ts/config). Bundled blueprints are read-only
 */
@Injectable()
export class ServerTypesInstaller {
  constructor(private readonly registry: ServerTypesRegistry) {}

  async installFromFile(file: Express.Multer.File): Promise<LoadedBlueprint> {
    return this.installFromBuffer(
      file.buffer,
      file.originalname || "blueprint",
    );
  }

  private async installFromBuffer(
    buffer: Buffer,
    filename: string,
  ): Promise<LoadedBlueprint> {
    const isJson =
      filename.toLowerCase().endsWith(".json") || this.looksLikeJson(buffer);
    const staged = isJson
      ? this.stageJson(buffer)
      : await this.stageArchive(buffer);

    try {
      const errors = this.registry.validate(staged.manifest);
      if (errors.length) {
        throw new BadRequestException(
          `Invalid blueprint: ${errors.join(", ")}`,
        );
      }

      const dest = join(
        this.registry.installedRoot,
        safeId(staged.manifest.id),
      );
      fs.mkdirSync(this.registry.installedRoot, { recursive: true });
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(staged.dir, dest, { recursive: true });

      this.registry.reload();
      const loaded = this.registry.get(staged.manifest.id);
      if (!loaded)
        throw new BadRequestException("Blueprint failed to load after install");
      return loaded;
    } finally {
      fs.rmSync(staged.dir, { recursive: true, force: true });
    }
  }

  /** Remove an installed blueprint; bundled ones are protected */
  remove(id: string): { id: string } {
    const loaded = this.registry.get(id);
    if (!loaded) throw new NotFoundException(`Unknown blueprint: ${id}`);
    if (loaded.source !== "installed") {
      throw new BadRequestException("Bundled blueprints cannot be removed");
    }
    fs.rmSync(loaded.dir, { recursive: true, force: true });
    this.registry.reload();
    return { id };
  }

  /** Stage a flat manifest as a one-file blueprint dir in a temp location */
  private stageJson(buffer: Buffer): {
    manifest: KubekBlueprintManifest;
    dir: string;
  } {
    const manifest = this.parseManifest(buffer);
    const dir = fs.mkdtempSync(join(os.tmpdir(), "kubek-bp-"));
    fs.writeFileSync(
      join(dir, "blueprint.json"),
      JSON.stringify(manifest, null, 2),
    );
    return { manifest, dir };
  }

  /** Unpack an archive and locate its blueprint.json (root or first subdir) */
  private async stageArchive(
    buffer: Buffer,
  ): Promise<{ manifest: KubekBlueprintManifest; dir: string }> {
    const work = fs.mkdtempSync(join(os.tmpdir(), "kubek-bp-"));
    const archivePath = join(work, "upload.zip");
    fs.writeFileSync(archivePath, buffer);

    const extractDir = join(work, "extracted");
    const ok = await unpackArchive(archivePath, extractDir, true);
    if (!ok) {
      fs.rmSync(work, { recursive: true, force: true });
      throw new BadRequestException("Failed to unpack blueprint archive");
    }

    const root = this.findManifestRoot(extractDir);
    if (!root) {
      fs.rmSync(work, { recursive: true, force: true });
      throw new BadRequestException("Archive has no blueprint.json");
    }
    const manifest = this.parseManifest(
      fs.readFileSync(join(root, "blueprint.json")),
    );
    return { manifest, dir: root };
  }

  /** blueprint.json at the extract root, else inside the single top-level folder */
  private findManifestRoot(dir: string): string | null {
    if (fs.existsSync(join(dir, "blueprint.json"))) return dir;
    for (const entry of fs.readdirSync(dir)) {
      const sub = join(dir, entry);
      if (
        fs.statSync(sub).isDirectory() &&
        fs.existsSync(join(sub, "blueprint.json"))
      )
        return sub;
    }
    return null;
  }

  private parseManifest(buffer: Buffer): KubekBlueprintManifest {
    try {
      const manifest = JSON.parse(
        buffer.toString("utf-8"),
      ) as KubekBlueprintManifest;
      if (!manifest?.id) throw new Error("missing id");
      return manifest;
    } catch (e: unknown) {
      throw new BadRequestException(
        `Invalid blueprint manifest: ${getErrorMessage(e)}`,
      );
    }
  }

  private looksLikeJson(buffer: Buffer): boolean {
    return buffer.subarray(0, 64).toString("utf-8").trimStart().startsWith("{");
  }
}
