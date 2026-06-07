import type { DownloadSpec, VersionEntry } from "@kubekpanel/blueprint-sdk";
import { BadRequestException, Injectable } from "@nestjs/common";
import { BlueprintResolver } from "../blueprint-resolver.service";
import type { LoadedBlueprint, ResolveScope } from "../server-types.types";
import { HttpEngine } from "./http-engine.service";
import { ResolverRunner } from "./resolver-runner.service";

/**
 * Entry point for version resolution. Dispatches on blueprint.versions.kind to the HTTP engine,
 * the versions.ts runner, or the static/none paths
 */
@Injectable()
export class VersionResolverService {
  constructor(
    private readonly httpEngine: HttpEngine,
    private readonly runner: ResolverRunner,
    private readonly resolver: BlueprintResolver,
  ) {}

  async listVersions(
    blueprint: LoadedBlueprint,
    scope?: ResolveScope,
  ): Promise<string[]> {
    const spec = blueprint.manifest.versions;
    const baseScope = scope ?? this.resolver.buildScope(blueprint.manifest);

    switch (spec.kind) {
      case "none":
        return [];
      case "static":
        return spec.versions.map((v) => v.id);
      case "http":
        return this.httpEngine.listVersions(spec.list, baseScope);
      case "resolver": {
        const resolver =
          blueprint.resolver ??
          (await this.runner.load(blueprint.dir, spec.module));
        const entries = await resolver.listVersions(
          this.runner.buildContext(baseScope),
        );
        return entries.map((e) => e.id);
      }
    }
  }

  async resolveDownload(
    blueprint: LoadedBlueprint,
    version: string,
    scope?: ResolveScope,
  ): Promise<DownloadSpec> {
    const spec = blueprint.manifest.versions;
    const baseScope = scope ?? this.resolver.buildScope(blueprint.manifest);
    // bind the chosen version both generically and to the version-bound variable
    baseScope.version = version;
    const versionVar = this.resolver.versionVariable(blueprint.manifest);
    if (versionVar) baseScope[versionVar.key] = version;

    switch (spec.kind) {
      case "static": {
        const entry: VersionEntry | undefined = spec.versions.find(
          (v) => v.id === version,
        );
        if (!entry?.url)
          throw new BadRequestException(
            `No download URL for version ${version}`,
          );
        return { url: entry.url, unpack: entry.unpack };
      }
      case "http": {
        if (!spec.resolveDownload) {
          throw new BadRequestException(
            "Blueprint has no resolveDownload step",
          );
        }
        const url = await this.httpEngine.resolveDownload(
          spec.resolveDownload,
          baseScope,
        );
        return { url };
      }
      case "resolver": {
        const resolver =
          blueprint.resolver ??
          (await this.runner.load(blueprint.dir, spec.module));
        return resolver.resolveDownload(
          version,
          this.runner.buildContext(baseScope),
        );
      }
      case "none":
        throw new BadRequestException(
          "This server type has no downloadable version",
        );
    }
  }
}
