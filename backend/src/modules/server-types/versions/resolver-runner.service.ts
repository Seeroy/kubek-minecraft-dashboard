import type {
  VersionResolver,
  VersionResolverContext,
} from "@kubekpanel/blueprint-sdk";
import { Injectable, Logger } from "@nestjs/common";
import { join } from "path";
import { pathToFileURL } from "url";
import type { ResolveScope } from "../server-types.types";

/**
 * Runs a blueprint-supplied versions.ts resolver
 */
@Injectable()
export class ResolverRunner {
  private readonly logger = new Logger(ResolverRunner.name);
  private readonly cache = new Map<string, VersionResolver>();

  async load(
    blueprintDir: string,
    modulePath: string,
  ): Promise<VersionResolver> {
    const abs = join(blueprintDir, modulePath);
    const cached = this.cache.get(abs);
    if (cached) return cached;

    const mod = await import(pathToFileURL(abs).href);
    const resolver: VersionResolver = mod.default ?? mod.resolver;
    if (!resolver?.listVersions || !resolver?.resolveDownload) {
      throw new Error(
        `versions.ts at ${abs} does not export a VersionResolver`,
      );
    }
    this.cache.set(abs, resolver);
    return resolver;
  }

  buildContext(scope: ResolveScope): VersionResolverContext {
    const variables: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(scope)) {
      if (v !== undefined) variables[k] = v;
    }
    return {
      fetch: (url, init) => fetch(url, init),
      variables,
      platform: {
        os: process.platform as VersionResolverContext["platform"]["os"],
        arch: process.arch as VersionResolverContext["platform"]["arch"],
      },
    };
  }
}
