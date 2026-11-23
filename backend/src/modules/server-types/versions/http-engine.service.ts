import type { HttpStep } from "@kubekpanel/blueprint-sdk";
import { Injectable, Logger } from "@nestjs/common";
import ky from "ky";
import semver from "semver";
import { BlueprintResolver } from "../blueprint-resolver.service";
import type { ResolveScope } from "../server-types.types";

/**
 * Declarative HTTP engine for blueprint version specs. Runs a request, extracts data with a small
 * JSONPath/regex/header selector, then optionally filters, maps, sorts and chains
 */
@Injectable()
export class HttpEngine {
  private readonly logger = new Logger(HttpEngine.name);

  constructor(private readonly resolver: BlueprintResolver) {}

  /** Run a step and return the extracted value (array for lists, scalar for single lookups) */
  async run(step: HttpStep, scope: ResolveScope): Promise<unknown> {
    return (await this.runChain(step, scope)).result;
  }

  /** Extract versions list as strings */
  async listVersions(step: HttpStep, scope: ResolveScope): Promise<string[]> {
    const result = await this.run(step, scope);
    if (!Array.isArray(result)) return [];
    return result.map((v) => String(v));
  }

  /** Resolve a single download URL, from a list the newest by the last step's sort */
  async resolveDownload(step: HttpStep, scope: ResolveScope): Promise<string> {
    const { result, step: last } = await this.runChain(step, scope);
    const url = Array.isArray(result)
      ? last.sort?.endsWith("-asc")
        ? result[result.length - 1]
        : result[0]
      : result;
    return String(url ?? "");
  }

  /** Runs a step and its then chain, returns the result with the step that made it */
  private async runChain(
    step: HttpStep,
    scope: ResolveScope,
  ): Promise<{ result: unknown; step: HttpStep }> {
    const platformScope = step.platform
      ? { ...scope, ...platformVars() }
      : scope;

    let result = await this.fetchSelected(step, platformScope);

    if (step.filter && Array.isArray(result)) {
      result = result.filter((item) => evalFilter(step.filter!, item));
    }
    if (step.map && Array.isArray(result)) {
      result = result.map((item) => pickField(item, step.map!));
    }
    if (step.sort && Array.isArray(result)) {
      result = sortValues(result as string[], step.sort);
    }

    if (step.then) {
      // Newest element: first of a descending list, last of anything else
      const prev = Array.isArray(result)
        ? step.sort?.endsWith("-desc")
          ? result[0]
          : result[result.length - 1]
        : result;
      const nextScope = { ...platformScope, prev: prev as string | number };
      // terminal { url } form: build the final string, do not fetch it
      if ("url" in step.then && !("request" in step.then)) {
        return {
          result: this.resolver.substitute(step.then.url, nextScope),
          step,
        };
      }
      return this.runChain(step.then as HttpStep, nextScope);
    }

    return { result, step };
  }

  /** Request and select, following paginate.nextSelect while pages keep coming */
  private async fetchSelected(
    step: HttpStep,
    scope: ResolveScope,
  ): Promise<unknown> {
    let url = this.resolver.substitute(step.request.url, scope);
    const paginate = step.paginate;
    if (!paginate) {
      const page = await this.request(step, url, scope, true);
      return this.select(step.select, page.data, page.headers, scope);
    }

    const maxPages = Math.min(Math.max(paginate.max ?? 10, 1), MAX_PAGES);
    const seen = new Set<string>();
    let items: unknown[] | undefined;
    for (let page = 0; page < maxPages; page++) {
      seen.add(url);
      const res = await this.request(step, url, scope, page === 0);
      const selected = this.select(step.select, res.data, res.headers, scope);
      if (!Array.isArray(selected)) return items ?? selected;
      items = [...(items ?? []), ...selected];
      if (!selected.length) break;

      const next = this.nextPageUrl(paginate.nextSelect, res, url, scope);
      if (!next || seen.has(next)) break;
      url = next;
    }
    return items ?? [];
  }

  private async request(
    step: HttpStep,
    url: string,
    scope: ResolveScope,
    withQuery: boolean,
  ): Promise<{ data: unknown; headers: Record<string, string> }> {
    const headers = this.substituteRecord(step.request.headers, scope);
    // Next page URLs carry their own query string
    const query = withQuery
      ? this.substituteRecord(step.request.query, scope)
      : undefined;

    const method = step.request.method ?? "GET";
    const hasBody = step.request.body !== undefined && method !== "GET";

    const response = await ky(url, {
      method,
      headers: { "User-Agent": "Kubek/1.0", ...headers },
      searchParams: query,
      ...(hasBody ? { json: step.request.body } : {}),
      timeout: 8000,
    });

    const resHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      resHeaders[key] = value;
    });

    // Attempt JSON, fall back to the raw text body for text-regex selectors
    const text = await response.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // keep raw text for text-regex selectors
    }
    return { data, headers: resHeaders };
  }

  /** Next page from the selector, a Link header gives its rel="next" target */
  private nextPageUrl(
    nextSelect: string,
    res: { data: unknown; headers: Record<string, string> },
    current: string,
    scope: ResolveScope,
  ): string | null {
    const selected = this.select(nextSelect, res.data, res.headers, scope);
    if (typeof selected !== "string" || !selected.trim()) return null;
    let next: string | undefined = selected;
    if (nextSelect.startsWith("header:") && /rel="?next"?/.test(selected)) {
      next = /<([^>]+)>\s*;[^,]*rel="?next"?/.exec(selected)?.[1];
      if (!next) return null;
    }
    try {
      return new URL(next.trim(), current).href;
    } catch {
      return null;
    }
  }

  private substituteRecord(
    record: Record<string, string> | undefined,
    scope: ResolveScope,
  ): Record<string, string> | undefined {
    if (!record) return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(record))
      out[k] = this.resolver.substitute(v, scope);
    return out;
  }

  /** Tiny selector: "$..." JSONPath subset, "text-regex:<re>", or "header:<name>" */
  private select(
    select: string | undefined,
    data: unknown,
    headers: Record<string, unknown>,
    scope: ResolveScope,
  ): unknown {
    if (!select) return data;

    if (select.startsWith("header:")) {
      return headers[select.slice("header:".length).toLowerCase()];
    }
    if (select.startsWith("text-regex:")) {
      const re = new RegExp(select.slice("text-regex:".length));
      const match = re.exec(
        typeof data === "string" ? data : JSON.stringify(data),
      );
      return match ? (match[1] ?? match[0]) : undefined;
    }
    if (select.startsWith("$")) {
      return jsonPath(data, this.resolver.substitute(select, scope));
    }
    return data;
  }
}

/** Upper bound for paginate.max */
const MAX_PAGES = 50;

/** Platform substitution values for {{os}} / {{arch}} */
function platformVars(): ResolveScope {
  const archMap: Record<string, string> = { x64: "x64", arm64: "arm64" };
  return { os: process.platform, arch: archMap[process.arch] ?? process.arch };
}

/**
 * Minimal JSONPath subset: $, .field (field may contain ':'), .* (object keys), [*] (values,
 * one-level flatten), [index] (incl negative), [key] (object key access)
 */
function jsonPath(root: unknown, path: string): unknown {
  let current: unknown = root;
  // tokenize: .field | .* | [..]
  const tokens = path.match(/\.[^.\[]+|\[[^\]]+\]/g) ?? [];

  for (const token of tokens) {
    if (current == null) return undefined;

    if (token === ".*") {
      current = isObject(current) ? Object.keys(current) : current;
    } else if (token.startsWith(".")) {
      current = (current as Record<string, unknown>)[token.slice(1)];
    } else {
      const inner = token.slice(1, -1).trim();
      if (inner === "*") {
        const values = Array.isArray(current)
          ? current
          : isObject(current)
            ? Object.values(current)
            : [];
        current = values.some(Array.isArray)
          ? (values as unknown[]).flat()
          : values;
      } else if (/^-?\d+$/.test(inner)) {
        const arr = current as unknown[];
        const idx = parseInt(inner, 10);
        current = idx < 0 ? arr[arr.length + idx] : arr[idx];
      } else {
        current = (current as Record<string, unknown>)[inner];
      }
    }
  }
  return current;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickField(item: unknown, field: string): unknown {
  if (field.startsWith("$")) return jsonPath(item, field);
  return isObject(item) ? item[field] : item;
}

/** Evaluate a simple "!a && b" filter against an object's boolean props */
function evalFilter(expr: string, item: unknown): boolean {
  if (!isObject(item)) return true;
  return expr.split("&&").every((rawTerm) => {
    const term = rawTerm.trim();
    if (!term) return true;
    const negate = term.startsWith("!");
    const prop = negate ? term.slice(1).trim() : term;
    const value = !!item[prop];
    return negate ? !value : value;
  });
}

function sortValues(
  values: string[],
  sort: NonNullable<HttpStep["sort"]>,
): string[] {
  if (sort === "none") return values;
  const direction = sort.endsWith("-asc") ? 1 : -1;
  if (sort.startsWith("semver")) {
    return [...values].sort((a, b) => {
      const va = semver.coerce(a);
      const vb = semver.coerce(b);
      if (va && vb) return semver.compare(va, vb) * direction;
      return a.localeCompare(b) * direction;
    });
  }
  return [...values].sort(
    (a, b) => (new Date(a).getTime() - new Date(b).getTime()) * direction,
  );
}
