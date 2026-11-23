import { ApiErrorCode } from "@/core/errors/error-codes";
import { getErrorMessage } from "@/core/utils/error";
import { satisfiesKubekVersion } from "@/core/utils/updates";
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type {
  CatalogIndex,
  CatalogItemBase,
  CatalogItemState,
  CatalogKind,
  CatalogReadmeResponse,
  CatalogResponse,
} from "@shared/types/catalog.types";
import { createHash } from "node:crypto";
import semver from "semver";

const DEFAULT_BASE_URL = "https://kubekpanel.github.io";
// Without it every page open hits GitHub, the index changes a few times a day at most
const CACHE_MS = 10 * 60_000;
const INDEX_TIMEOUT_MS = 10_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
const README_MAX_BYTES = 256 * 1024;
// Same as the upload limits for each kind
const MAX_PACKAGE_BYTES: Record<CatalogKind, number> = {
  blueprints: 25 * 1024 * 1024,
  extensions: 50 * 1024 * 1024,
};

interface Cached {
  index: CatalogIndex;
  fetchedAt: number;
}

/** What the panel has installed under an id */
export interface InstalledInfo {
  version: string;
  builtIn?: boolean;
}

export interface CatalogPackage {
  buffer: Buffer;
  filename: string;
  item: CatalogItemBase;
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private readonly cache = new Map<CatalogKind, Cached>();
  private readonly pending = new Map<CatalogKind, Promise<Cached>>();
  private readonly readmes = new Map<string, { markdown: string; fetchedAt: number }>();

  private baseUrl(): string {
    return (process.env.KUBEK_CATALOG_URL ?? DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    );
  }

  /** The index with install state, the last good copy when GitHub is down */
  async list<T extends CatalogItemBase>(
    kind: CatalogKind,
    installed: Map<string, InstalledInfo>,
    refresh = false,
  ): Promise<CatalogResponse<T & CatalogItemState>> {
    const { cached, stale } = await this.index(kind, refresh);
    const blocked = new Set(cached.index.blocked.map((b) => b.id));
    return {
      items: (cached.index.items as T[])
        .filter((item) => !blocked.has(item.id))
        .map((item) => ({
          ...item,
          ...this.state(item, installed.get(item.id)),
        })),
      blocked: cached.index.blocked,
      generatedAt: cached.index.generatedAt,
      fetchedAt: cached.fetchedAt,
      stale,
    };
  }

  /** Downloads a package and checks it against the index */
  async download(kind: CatalogKind, id: string): Promise<CatalogPackage> {
    const { cached } = await this.index(kind, false);
    const blocked = cached.index.blocked.find((b) => b.id === id);
    if (blocked)
      throw new BadRequestException({
        code: ApiErrorCode.CATALOG_ITEM_BLOCKED,
        message: `${id} is blocked: ${blocked.reason}`,
        details: [{ field: "id", message: blocked.reason }],
      });
    const item = cached.index.items.find((i) => i.id === id);
    if (!item) throw new NotFoundException(`${id} is not in the catalog`);

    const url = new URL(item.download.url);
    if (url.protocol !== "https:")
      throw this.unavailable(`${id} has a non-https download link`);
    const limit = MAX_PACKAGE_BYTES[kind];
    if (item.download.size > limit)
      throw this.unavailable(`${id} is larger than ${limit} bytes`);

    let buffer: Buffer;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buffer = await this.readLimited(res, limit);
    } catch (error) {
      throw this.unavailable(getErrorMessage(error));
    }

    // The index pins the exact bytes, a swapped release asset won't pass
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (hash !== item.download.sha256)
      throw new BadGatewayException({
        code: ApiErrorCode.CATALOG_CHECKSUM_MISMATCH,
        message: `Checksum mismatch for ${id}`,
      });

    const filename = decodeURIComponent(url.pathname.split("/").pop() || id);
    return { buffer, filename, item };
  }

  /** README in the panel language, README.md when there is none */
  async readme(
    kind: CatalogKind,
    id: string,
    lang?: string,
  ): Promise<CatalogReadmeResponse> {
    const { cached } = await this.index(kind, false);
    const item = cached.index.items.find((i) => i.id === id);
    const files = item?.readme?.files ?? {};
    const picked = lang && files[lang] ? lang : files.default ? "default" : Object.keys(files)[0];
    if (!item || !picked) throw new NotFoundException(`${id} has no README`);

    // Only files next to the index, an entry can't point the panel anywhere else
    const url = new URL(files[picked]!);
    if (url.protocol !== "https:" || url.origin !== new URL(this.baseUrl()).origin)
      throw this.unavailable(`${id} README is outside the catalog`);

    const hit = this.readmes.get(url.href);
    if (hit && Date.now() - hit.fetchedAt < CACHE_MS)
      return { markdown: hit.markdown, lang: picked, base: item.readme?.base ?? null };
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(INDEX_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const markdown = (await this.readLimited(res, README_MAX_BYTES)).toString("utf8");
      this.readmes.set(url.href, { markdown, fetchedAt: Date.now() });
      return { markdown, lang: picked, base: item.readme?.base ?? null };
    } catch (error) {
      if (hit) return { markdown: hit.markdown, lang: picked, base: item.readme?.base ?? null };
      throw this.unavailable(getErrorMessage(error));
    }
  }

  private state(
    item: CatalogItemBase,
    installed: InstalledInfo | undefined,
  ): CatalogItemState {
    const version = installed?.version ?? null;
    return {
      compatible: this.compatible(item.engines?.kubek),
      installedVersion: version,
      updateAvailable:
        !!version &&
        !installed?.builtIn &&
        !!semver.valid(version) &&
        !!semver.valid(item.version) &&
        semver.gt(item.version, version),
      builtIn: !!installed?.builtIn,
    };
  }

  private compatible(range: string | undefined): boolean {
    if (!range) return true;
    try {
      return satisfiesKubekVersion(range);
    } catch {
      return false;
    }
  }

  private async index(
    kind: CatalogKind,
    refresh: boolean,
  ): Promise<{ cached: Cached; stale: boolean }> {
    const cached = this.cache.get(kind);
    if (cached && !refresh && Date.now() - cached.fetchedAt < CACHE_MS)
      return { cached, stale: false };

    // Parallel requests share one download
    let request = this.pending.get(kind);
    if (!request) {
      request = this.fetchIndex(kind).finally(() => this.pending.delete(kind));
      this.pending.set(kind, request);
    }

    try {
      const fresh = await request;
      this.cache.set(kind, fresh);
      return { cached: fresh, stale: false };
    } catch (error) {
      const reason = getErrorMessage(error);
      if (cached) {
        this.logger.warn(
          `${kind} index refresh failed, using the old copy: ${reason}`,
        );
        return { cached, stale: true };
      }
      throw this.unavailable(reason);
    }
  }

  private async fetchIndex(kind: CatalogKind): Promise<Cached> {
    const res = await fetch(`${this.baseUrl()}/${kind}/index.json`, {
      signal: AbortSignal.timeout(INDEX_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const index = (await res.json()) as CatalogIndex;
    if (index?.schemaVersion !== 1 || !Array.isArray(index.items))
      throw new Error("Unsupported index format");
    return {
      index: {
        ...index,
        blocked: Array.isArray(index.blocked) ? index.blocked : [],
      },
      fetchedAt: Date.now(),
    };
  }

  // content-length can lie or be missing, so count while reading
  private async readLimited(res: Response, limit: number): Promise<Buffer> {
    if (!res.body) return Buffer.alloc(0);
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      total += chunk.byteLength;
      if (total > limit)
        throw new Error(`Package is larger than ${limit} bytes`);
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  private unavailable(reason: string) {
    return new BadGatewayException({
      code: ApiErrorCode.CATALOG_UNAVAILABLE,
      message: `Catalog is unavailable: ${reason}`,
      details: [{ field: "catalog", message: reason }],
    });
  }
}
