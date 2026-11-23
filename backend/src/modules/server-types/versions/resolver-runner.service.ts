import type {
  VersionResolver,
  VersionResolverContext,
} from "@kubekpanel/blueprint-sdk";
import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { existsSync, readFileSync, realpathSync } from "fs";
import { join, resolve, sep } from "path";
import { pathToFileURL } from "url";
import type { ResolveScope } from "../server-types.types";

/**
 * Runs a blueprint-supplied versions.ts resolver
 */
@Injectable()
export class ResolverRunner {
  private readonly logger = new Logger(ResolverRunner.name);
  private readonly cache = new Map<
    string,
    { hash: string; resolver: VersionResolver }
  >();

  /** Imports versions.ts once per content, an updated blueprint gets its new code */
  async load(
    blueprintDir: string,
    modulePath: string,
  ): Promise<VersionResolver> {
    const abs = resolve(join(blueprintDir, modulePath));
    const hash = createHash("sha1").update(readFileSync(abs)).digest("hex");
    const cached = this.cache.get(abs);
    if (cached?.hash === hash) return cached.resolver;
    if (cached) this.invalidate(blueprintDir);

    const mod = await import(pathToFileURL(abs).href);
    const resolver: VersionResolver = mod.default ?? mod.resolver;
    if (!resolver?.listVersions || !resolver?.resolveDownload) {
      throw new Error(
        `versions.ts at ${abs} does not export a VersionResolver`,
      );
    }
    this.cache.set(abs, { hash, resolver });
    return resolver;
  }

  /** Forget a blueprint's modules, helpers it imports included */
  invalidate(blueprintDir: string): void {
    const roots = [resolve(blueprintDir) + sep];
    // Module keys can be the real path, e.g. /private/var on macOS
    if (existsSync(blueprintDir)) roots.push(realpathSync(blueprintDir) + sep);
    const inside = (key: string) => roots.some((r) => key.startsWith(r));
    for (const key of [...this.cache.keys()])
      if (inside(key)) this.cache.delete(key);
    for (const key of Object.keys(require.cache))
      if (inside(key)) delete require.cache[key];
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
