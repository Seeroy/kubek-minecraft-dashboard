import type {
  BlueprintVariable,
  KubekBlueprintManifest,
  QuerySpec,
} from "@kubekpanel/blueprint-sdk";
import { BadRequestException, Injectable } from "@nestjs/common";
import { resolve } from "path";
import type { ResolveScope } from "./server-types.types";

type VariableValue = string | number | boolean;

/**
 * Resolves {{...}} substitutions and derives variable/port values for a blueprint
 */
@Injectable()
export class BlueprintResolver {
  /** Build a substitution scope from a blueprint and a server's variable values */
  buildScope(
    blueprint: KubekBlueprintManifest,
    opts: {
      serverId?: string;
      serverName?: string;
      variables?: Record<string, unknown>;
    } = {},
  ): ResolveScope {
    const scope: ResolveScope = {};

    for (const variable of blueprint.variables) {
      const value = opts.variables?.[variable.key];
      scope[variable.key] = (value ?? variable.default ?? "") as
        | string
        | number
        | boolean;
    }

    for (const port of blueprint.ports) {
      const override = opts.variables?.[port.key];
      scope[port.key] =
        (override as number | undefined) ?? scope[port.key] ?? port.default;
      if (port.env) scope[port.env] = scope[port.key];
    }

    const primaryPort =
      blueprint.ports.find((p) => p.primary) ?? blueprint.ports[0];
    if (opts.serverId) {
      scope.SERVER_ID = opts.serverId;
      scope.SERVER_DIR = resolve(`./servers/${opts.serverId}`);
    }
    if (opts.serverName) scope.SERVER_NAME = opts.serverName;
    if (primaryPort)
      scope.SERVER_PORT = scope[primaryPort.key] ?? primaryPort.default;

    // Host platform tokens so blueprints that download a raw executable can name it per OS
    scope.HOST_OS = process.platform;
    scope.EXE_SUFFIX = process.platform === "win32" ? ".exe" : "";

    // Docker tokens: file ownership and the nearest existing itzg java image tag
    scope.HOST_UID = process.getuid?.() ?? "";
    scope.HOST_GID = process.getgid?.() ?? "";
    const javaTag = this.javaImageTag(scope.JAVA_VERSION);
    if (javaTag) scope.JAVA_IMAGE_TAG = javaTag;

    return scope;
  }

  /** Map a requested Java version to the nearest itzg image tag that actually exists */
  private javaImageTag(version: ResolveScope[string]): string | undefined {
    const tags = [8, 11, 16, 17, 21, 25];
    const v = Number(version);
    if (!Number.isFinite(v)) return undefined;
    const tag = tags.includes(v) ? v : (tags.find((t) => t >= v) ?? 25);
    return `java${tag}`;
  }

  /**
   * Validate and normalize a server's variable values against the blueprint schema
   */
  validateVariables(
    blueprint: KubekBlueprintManifest,
    input: Record<string, unknown> = {},
  ): Record<string, VariableValue> {
    const result: Record<string, VariableValue> = {};

    for (const variable of blueprint.variables) {
      const raw = input[variable.key];
      const value = raw ?? variable.default;
      if (value === undefined) {
        if (this.isRequired(variable.rules)) {
          throw new BadRequestException(`Variable ${variable.key} is required`);
        }
        continue;
      }
      const coerced = this.coerceVariable(variable, value);
      this.enforceRules(variable, coerced);
      result[variable.key] = coerced;
    }

    for (const port of blueprint.ports) {
      const raw = input[port.key];
      const num = raw === undefined ? port.default : Number(raw);
      if (Number.isNaN(num)) {
        throw new BadRequestException(`Port ${port.key} must be a number`);
      }
      result[port.key] = num;
    }

    return result;
  }

  private coerceVariable(
    variable: BlueprintVariable,
    value: unknown,
  ): VariableValue {
    switch (variable.type) {
      case "number": {
        const num = Number(value);
        if (Number.isNaN(num)) {
          throw new BadRequestException(
            `Variable ${variable.key} must be a number`,
          );
        }
        return num;
      }
      case "boolean":
        return value === true || value === "true";
      default:
        return String(value);
    }
  }

  private isRequired(rules?: string): boolean {
    return this.parseRules(rules).includes("required");
  }

  private enforceRules(
    variable: BlueprintVariable,
    value: VariableValue,
  ): void {
    for (const rule of this.parseRules(variable.rules)) {
      const [name, arg] = rule.split(":");
      if (name === "min" && typeof value === "number" && value < Number(arg)) {
        throw new BadRequestException(
          `Variable ${variable.key} must be >= ${arg}`,
        );
      }
      if (name === "max" && typeof value === "number" && value > Number(arg)) {
        throw new BadRequestException(
          `Variable ${variable.key} must be <= ${arg}`,
        );
      }
      if (name === "accepted" && value !== true) {
        throw new BadRequestException(
          `Variable ${variable.key} must be accepted`,
        );
      }
      if (name === "url" && !/^https?:\/\//.test(String(value))) {
        throw new BadRequestException(`Variable ${variable.key} must be a URL`);
      }
      // rules beyond these are not enforced yet
    }
  }

  private parseRules(rules?: string): string[] {
    return rules
      ? rules
          .split("|")
          .map((r) => r.trim())
          .filter(Boolean)
      : [];
  }

  /** Replace every {{KEY}} in template with its scope value (unknown keys become empty) */
  substitute(template: string, scope: ResolveScope): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
      const value = scope[key];
      return value === undefined ? "" : String(value);
    });
  }

  /** The variable whose options come from the version list, if any */
  versionVariable(
    blueprint: KubekBlueprintManifest,
  ): BlueprintVariable | undefined {
    return blueprint.variables.find((v) => v.options?.from === "versions");
  }

  /** Managed Java version for a blueprint that declares JAVA_VERSION, else undefined */
  javaVersion(
    blueprint: KubekBlueprintManifest,
    scope: ResolveScope,
  ): string | undefined {
    const javaVar = blueprint.variables.find((v) => v.key === "JAVA_VERSION");
    if (!javaVar) return undefined;
    return String(scope.JAVA_VERSION ?? javaVar.default ?? 21);
  }

  /** Resolve a query port from its spec against a scope */
  resolveQueryPort(query: QuerySpec, scope: ResolveScope): number | undefined {
    if ("value" in query.port) return query.port.value;
    const raw = scope[query.port.fromVariable];
    const num = typeof raw === "number" ? raw : parseInt(String(raw), 10);
    return Number.isNaN(num) ? undefined : num;
  }
}
