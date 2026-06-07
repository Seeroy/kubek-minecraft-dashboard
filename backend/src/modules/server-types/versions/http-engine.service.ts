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
    const platformScope = step.platform
      ? { ...scope, ...platformVars() }
      : scope;

    const url = this.resolver.substitute(step.request.url, platformScope);
    const headers = this.substituteRecord(step.request.headers, platformScope);
    const query = this.substituteRecord(step.request.query, platformScope);

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

    let result = this.select(step.select, data, resHeaders, platformScope);

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
      const prev = Array.isArray(result) ? result[result.length - 1] : result;
      const nextScope = { ...platformScope, prev: prev as string | number };
      // terminal { url } form: build the final string, do not fetch it
      if ("url" in step.then && !("request" in step.then)) {
        return this.resolver.substitute(step.then.url, nextScope);
      }
      return this.run(step.then as HttpStep, nextScope);
    }

    return result;
  }

  /** Extract versions list as strings */
  async listVersions(step: HttpStep, scope: ResolveScope): Promise<string[]> {
    const result = await this.run(step, scope);
    if (!Array.isArray(result)) return [];
    return result.map((v) => String(v));
  }

  /** Resolve a single download URL */
  async resolveDownload(step: HttpStep, scope: ResolveScope): Promise<string> {
    const result = await this.run(step, scope);
    const url = Array.isArray(result) ? result[0] : result;
    return String(url ?? "");
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
