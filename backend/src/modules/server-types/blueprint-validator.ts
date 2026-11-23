// Keep in line with the catalog copy in KubekPanel/blueprints scripts/manifest-rules.ts

type Obj = Record<string, unknown>;

export const VERSION_KINDS = ["none", "static", "http", "resolver"];
export const RUNTIME_KINDS = ["native", "docker"];
export const PLATFORMS = ["win32", "linux", "darwin"];
export const INSTALL_STEP_TYPES = [
  "download",
  "writeFile",
  "chmod",
  "dockerPull",
  "template",
  "exec",
  "steamcmd",
];
const VARIABLE_TYPES = ["string", "number", "boolean", "enum", "secret"];
const PORT_PROTOCOLS = ["tcp", "udp", "tcp+udp"];
const STOP_TYPES = [
  "command",
  "signal:SIGINT",
  "signal:SIGTERM",
  "signal:SIGKILL",
  "rcon",
];
const QUERY_PROTOCOLS = [
  "minecraft-java",
  "minecraft-bedrock",
  "source-a2s",
  "none",
];
const HTTP_SORTS = [
  "semver-desc",
  "semver-asc",
  "date-desc",
  "date-asc",
  "none",
];
const CONFIG_PARSERS = ["properties", "json", "yaml", "ini", "toml", "text"];
const STEAM_PLATFORMS = ["windows", "linux", "macos"];
const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ENV_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
// User values must not steer the loader, the shell or the panel itself
const RESERVED_ENV = /^(PATH|LD_\w+|DYLD_\w+|KUBEK_\w+)$/i;
const DOCKER_PLATFORM_PATTERN = /^[a-z0-9]+\/[a-z0-9_]+(\/[a-z0-9]+)?$/;

const isObj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNonEmptyStr = (v: unknown): v is string => isStr(v) && v.trim() !== "";

/** Relative path that stays inside its base, {{...}} tokens allowed */
export function isSafeRelativePath(value: string): boolean {
  if (!value.trim()) return false;
  if (
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[A-Za-z]:/.test(value)
  )
    return false;
  return !value.split(/[\\/]/).includes("..");
}

class Collector {
  readonly errors: string[] = [];

  add(message: string): void {
    this.errors.push(message);
  }

  optionalString(obj: Obj, key: string, at: string): void {
    if (obj[key] !== undefined && !isStr(obj[key]))
      this.add(`${at}.${key} must be a string`);
  }

  optionalBoolean(obj: Obj, key: string, at: string): void {
    if (obj[key] !== undefined && typeof obj[key] !== "boolean")
      this.add(`${at}.${key} must be a boolean`);
  }

  requiredString(obj: Obj, key: string, at: string): void {
    if (!isNonEmptyStr(obj[key])) this.add(`${at}.${key} is required`);
  }

  stringRecord(value: unknown, at: string): void {
    if (value === undefined) return;
    if (!isObj(value)) return this.add(`${at} must be an object`);
    for (const [k, v] of Object.entries(value))
      if (!isStr(v)) this.add(`${at}.${k} must be a string`);
  }

  platformRecord(value: unknown, at: string): number {
    if (value === undefined) return 0;
    if (!isObj(value)) {
      this.add(`${at} must be an object`);
      return 0;
    }
    let count = 0;
    for (const [k, v] of Object.entries(value)) {
      if (!PLATFORMS.includes(k)) this.add(`${at} has unknown platform "${k}"`);
      else if (!isNonEmptyStr(v)) this.add(`${at}.${k} must be a string`);
      else count++;
    }
    return count;
  }
}

/** Every problem found in a manifest, empty when it is fine */
export function validateManifest(manifest: unknown): string[] {
  const c = new Collector();
  if (!isObj(manifest)) return ["manifest must be a JSON object"];
  const m = manifest;

  if (!isNonEmptyStr(m.id)) c.add("missing id");
  if (!isNonEmptyStr(m.name)) c.add("missing name");
  if (m.game !== undefined && !isStr(m.game)) c.add("game must be a string");

  if (m.platforms !== undefined) {
    if (!Array.isArray(m.platforms)) c.add("platforms must be an array");
    else
      for (const p of m.platforms)
        if (!PLATFORMS.includes(p as string))
          c.add(`unknown platform "${String(p)}"`);
  }

  const runtime = isObj(m.runtime) ? m.runtime : undefined;
  if (!RUNTIME_KINDS.includes(runtime?.kind as string)) {
    c.add(`unsupported runtime.kind: ${String(runtime?.kind)}`);
  }
  if (runtime?.kind === "docker" && m.dockerProfile === undefined) {
    c.add("runtime.kind docker requires a dockerProfile");
  }

  const keys = checkVariables(c, m.variables);
  const portKeys = checkPorts(c, m.ports);
  const refKeys = new Set([...keys, ...portKeys, "SERVER_PORT"]);
  checkVersions(c, m.versions);
  checkInstall(c, m.install);
  checkStartup(c, m.startup, runtime?.kind === "docker", refKeys);
  checkDetection(c, m.detection);
  checkQuery(c, m.query, refKeys);
  if (m.dockerProfile !== undefined) checkDockerProfile(c, m.dockerProfile, refKeys);
  checkConfigFiles(c, m.configFiles);

  if (m.features !== undefined) {
    if (!Array.isArray(m.features) || !m.features.every(isStr))
      c.add("features must be an array of strings");
  }
  return c.errors;
}

function checkVariables(c: Collector, value: unknown): string[] {
  if (!Array.isArray(value)) {
    c.add("variables must be an array");
    return [];
  }
  const keys: string[] = [];
  value.forEach((v, i) => {
    const at = `variables[${i}]`;
    if (!isObj(v)) return c.add(`${at} must be an object`);
    if (!isStr(v.key) || !KEY_PATTERN.test(v.key)) {
      c.add(`${at}.key must be letters, digits and _`);
    } else if (keys.includes(v.key)) {
      c.add(`${at}.key ${v.key} is declared twice`);
    } else {
      keys.push(v.key);
    }
    if (!VARIABLE_TYPES.includes(v.type as string))
      c.add(`${at}.type must be one of ${VARIABLE_TYPES.join(", ")}`);
    if (
      v.default !== undefined &&
      !["string", "number", "boolean"].includes(typeof v.default)
    )
      c.add(`${at}.default must be a string, number or boolean`);
    if (v.options !== undefined) {
      const o = v.options;
      if (!isObj(o) || (o.from !== "static" && o.from !== "versions"))
        c.add(`${at}.options.from must be "static" or "versions"`);
      else if (o.from === "static" && !Array.isArray(o.values))
        c.add(`${at}.options.values must be an array`);
    }
    checkEnvName(c, v.env, at);
    for (const k of ["label", "description", "rules"])
      c.optionalString(v, k, at);
    for (const k of ["userEditable", "editableAfterInstall"])
      c.optionalBoolean(v, k, at);
  });
  return keys;
}

function checkPorts(c: Collector, value: unknown): string[] {
  if (!Array.isArray(value)) {
    c.add("ports must be an array");
    return [];
  }
  const keys: string[] = [];
  let primaries = 0;
  value.forEach((p, i) => {
    const at = `ports[${i}]`;
    if (!isObj(p)) return c.add(`${at} must be an object`);
    if (!isStr(p.key) || !KEY_PATTERN.test(p.key)) {
      c.add(`${at}.key must be letters, digits and _`);
    } else if (keys.includes(p.key)) {
      c.add(`${at}.key ${p.key} is declared twice`);
    } else {
      keys.push(p.key);
    }
    if (
      typeof p.default !== "number" ||
      !Number.isInteger(p.default) ||
      p.default < 1 ||
      p.default > 65535
    )
      c.add(`${at}.default must be a port number 1-65535`);
    if (!PORT_PROTOCOLS.includes(p.protocol as string))
      c.add(`${at}.protocol must be one of ${PORT_PROTOCOLS.join(", ")}`);
    checkEnvName(c, p.env, at);
    if (isStr(p.env)) keys.push(p.env);
    c.optionalString(p, "label", at);
    c.optionalBoolean(p, "primary", at);
    if (p.primary === true) primaries++;
  });
  if (primaries > 1) c.add("only one port can be primary");
  return keys;
}

function checkEnvName(c: Collector, value: unknown, at: string): void {
  if (value === undefined) return;
  if (!isStr(value) || !ENV_PATTERN.test(value))
    c.add(`${at}.env must be an env var name`);
  else if (RESERVED_ENV.test(value)) c.add(`${at}.env ${value} is reserved`);
}

function checkVersions(c: Collector, value: unknown): void {
  if (!isObj(value) || !VERSION_KINDS.includes(value.kind as string)) {
    c.add(
      `unsupported versions.kind: ${String(isObj(value) ? value.kind : value)}`,
    );
    return;
  }
  switch (value.kind) {
    case "static":
      if (!Array.isArray(value.versions)) {
        c.add("versions.versions must be an array");
        return;
      }
      value.versions.forEach((v, i) => {
        const at = `versions.versions[${i}]`;
        if (!isObj(v)) return c.add(`${at} must be an object`);
        c.requiredString(v, "id", at);
        c.optionalString(v, "label", at);
        c.optionalString(v, "url", at);
        c.optionalBoolean(v, "unpack", at);
      });
      return;
    case "http":
      checkHttpStep(c, value.list, "versions.list");
      if (value.resolveDownload !== undefined)
        checkHttpStep(c, value.resolveDownload, "versions.resolveDownload");
      return;
    case "resolver":
      if (!isStr(value.module) || !isSafeRelativePath(value.module))
        c.add("versions.module must be a path inside the blueprint");
      return;
  }
}

function checkHttpStep(c: Collector, value: unknown, at: string): void {
  if (!isObj(value)) return c.add(`${at} must be an object`);
  const req = value.request;
  if (!isObj(req)) {
    c.add(`${at}.request is required`);
  } else {
    c.requiredString(req, "url", `${at}.request`);
    if (
      req.method !== undefined &&
      req.method !== "GET" &&
      req.method !== "POST"
    )
      c.add(`${at}.request.method must be GET or POST`);
    c.stringRecord(req.headers, `${at}.request.headers`);
    c.stringRecord(req.query, `${at}.request.query`);
  }
  for (const k of ["select", "filter", "map"]) c.optionalString(value, k, at);
  if (value.sort !== undefined && !HTTP_SORTS.includes(value.sort as string))
    c.add(`${at}.sort must be one of ${HTTP_SORTS.join(", ")}`);
  c.optionalBoolean(value, "platform", at);
  if (value.paginate !== undefined) {
    const p = value.paginate;
    if (!isObj(p) || !isNonEmptyStr(p.nextSelect))
      c.add(`${at}.paginate.nextSelect is required`);
    else if (
      p.max !== undefined &&
      (typeof p.max !== "number" || !Number.isInteger(p.max) || p.max < 1)
    )
      c.add(`${at}.paginate.max must be a positive integer`);
  }
  if (value.then !== undefined) {
    const then = value.then;
    if (isObj(then) && !("request" in then)) {
      if (!isNonEmptyStr(then.url)) c.add(`${at}.then.url is required`);
    } else {
      checkHttpStep(c, then, `${at}.then`);
    }
  }
}

function checkInstall(c: Collector, value: unknown): void {
  if (!isObj(value)) return c.add("install must be an object");
  if (value.runIn !== undefined && value.runIn !== "host") {
    c.add(
      `install.runIn ${JSON.stringify(value.runIn)} is not supported, only "host" is`,
    );
  }
  checkSteps(c, value.steps, "install.steps");
}

function checkSteps(c: Collector, value: unknown, at: string): void {
  if (!Array.isArray(value)) return c.add(`${at} must be an array`);
  value.forEach((step, i) => checkStep(c, step, `${at}[${i}]`));
}

function checkStep(c: Collector, step: unknown, at: string): void {
  if (!isObj(step)) return c.add(`${at} must be an object`);
  if (step.type === "script") {
    return c.add(`${at}: install step "script" is not supported, use "exec"`);
  }
  if (!INSTALL_STEP_TYPES.includes(step.type as string)) {
    return c.add(`${at}: unknown install step type "${String(step.type)}"`);
  }
  switch (step.type) {
    case "download":
      c.requiredString(step, "url", at);
      checkStepPath(c, step, "dest", at);
      c.optionalBoolean(step, "unpack", at);
      return;
    case "writeFile":
      checkStepPath(c, step, "path", at);
      if (!isStr(step.content)) c.add(`${at}.content must be a string`);
      return;
    case "chmod":
      checkStepPath(c, step, "path", at);
      if (!isStr(step.mode) || !/^[0-7]{3,4}$/.test(step.mode))
        c.add(`${at}.mode must be an octal string like "755"`);
      return;
    case "dockerPull":
      c.requiredString(step, "image", at);
      return;
    case "template":
      checkStepPath(c, step, "src", at);
      checkStepPath(c, step, "dest", at);
      return;
    case "exec": {
      const perOs = c.platformRecord(
        step.commandByPlatform,
        `${at}.commandByPlatform`,
      );
      if (step.command !== undefined && !isStr(step.command))
        c.add(`${at}.command must be a string`);
      if (!isNonEmptyStr(step.command) && !perOs)
        c.add(`${at} needs command or commandByPlatform`);
      if (
        step.timeoutSec !== undefined &&
        (typeof step.timeoutSec !== "number" || step.timeoutSec <= 0)
      )
        c.add(`${at}.timeoutSec must be a positive number`);
      return;
    }
    case "steamcmd":
      c.requiredString(step, "appId", at);
      c.optionalString(step, "beta", at);
      c.optionalString(step, "betaPassword", at);
      c.optionalBoolean(step, "validate", at);
      if (
        step.platform !== undefined &&
        !STEAM_PLATFORMS.includes(step.platform as string)
      )
        c.add(`${at}.platform must be one of ${STEAM_PLATFORMS.join(", ")}`);
      return;
  }
}

function checkStepPath(c: Collector, step: Obj, key: string, at: string): void {
  const v = step[key];
  if (!isStr(v) || !isSafeRelativePath(v))
    c.add(`${at}.${key} must be a relative path inside the folder`);
}

function checkStartup(
  c: Collector,
  value: unknown,
  dockerOnly: boolean,
  keys: Set<string>,
): void {
  if (!isObj(value)) return c.add("startup must be an object");
  const perOs = c.platformRecord(
    value.commandByPlatform,
    "startup.commandByPlatform",
  );
  if (value.command !== undefined && !isStr(value.command))
    c.add("startup.command must be a string");
  const hasCommand = isNonEmptyStr(value.command) || perOs > 0;
  // A native blueprint has to say how to launch, docker images bring their own command
  if (!hasCommand && !dockerOnly)
    c.add("startup.command or startup.commandByPlatform is required");
  if (value.workingDir !== undefined) {
    if (!isStr(value.workingDir) || !isSafeRelativePath(value.workingDir))
      c.add(
        "startup.workingDir must be a relative path inside the server folder",
      );
  }
  checkStop(c, value.stop, "startup.stop", keys);
}

function checkStop(
  c: Collector,
  value: unknown,
  at: string,
  keys: Set<string>,
): void {
  if (!isObj(value)) return c.add(`${at} is required`);
  if (!STOP_TYPES.includes(value.type as string)) {
    c.add(`${at}.type must be one of ${STOP_TYPES.join(", ")}`);
  } else if (value.type === "command" && !isNonEmptyStr(value.value)) {
    c.add(`${at}.value is required for a command stop`);
  } else if (value.type === "rcon") {
    if (!isNonEmptyStr(value.command))
      c.add(`${at}.command is required for an rcon stop`);
    c.optionalString(value, "host", at);
    checkRef(c, value.port, `${at}.port`, keys, "port");
    checkRef(c, value.password, `${at}.password`, keys, "text");
  }
  if (
    value.timeoutSec !== undefined &&
    (typeof value.timeoutSec !== "number" ||
      value.timeoutSec < 1 ||
      value.timeoutSec > 3600)
  )
    c.add(`${at}.timeoutSec must be 1-3600`);
}

// { value } or { fromVariable } naming a variable or a port key
function checkRef(
  c: Collector,
  ref: unknown,
  at: string,
  keys: Set<string>,
  kind: "port" | "text",
): void {
  if (!isObj(ref)) return c.add(`${at} needs value or fromVariable`);
  if ("value" in ref) {
    const v = ref.value;
    if (kind === "port" && !(typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 65535))
      c.add(`${at}.value must be a port number`);
    if (kind === "text" && !isNonEmptyStr(v)) c.add(`${at}.value must be a non-empty string`);
  } else if (!isStr(ref.fromVariable)) {
    c.add(`${at} needs value or fromVariable`);
  } else if (!keys.has(ref.fromVariable)) {
    c.add(`${at}.fromVariable ${ref.fromVariable} is not a variable or port`);
  }
}

function checkDetection(c: Collector, value: unknown): void {
  if (value === undefined) return;
  if (!isObj(value)) return c.add("detection must be an object");
  for (const key of ["starting", "running", "stopping", "crash"]) {
    const list = value[key];
    if (list === undefined) continue;
    if (!Array.isArray(list)) {
      c.add(`detection.${key} must be an array`);
      continue;
    }
    list.forEach((pattern, i) => {
      if (!isStr(pattern))
        return c.add(`detection.${key}[${i}] must be a string`);
      try {
        new RegExp(pattern, "i");
      } catch {
        c.add(`detection.${key}[${i}] is not a valid RegExp`);
      }
    });
  }
}

function checkQuery(c: Collector, value: unknown, keys: Set<string>): void {
  if (!isObj(value)) return c.add("query must be an object");
  const protocol = value.protocol;
  if (
    !isStr(protocol) ||
    !(
      QUERY_PROTOCOLS.includes(protocol) ||
      (protocol.startsWith("gamedig:") && protocol.length > "gamedig:".length)
    )
  ) {
    c.add(
      `query.protocol must be one of ${QUERY_PROTOCOLS.join(", ")} or gamedig:<id>`,
    );
  }
  c.optionalString(value, "host", "query");
  const port = value.port;
  if (!isObj(port)) return c.add("query.port is required");
  if ("value" in port) {
    const v = port.value;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 65535)
      c.add("query.port.value must be a port number");
  } else if (!isStr(port.fromVariable)) {
    c.add("query.port needs value or fromVariable");
  } else if (!keys.has(port.fromVariable)) {
    c.add(
      `query.port.fromVariable ${port.fromVariable} is not a variable or port`,
    );
  }
}

function checkDockerProfile(
  c: Collector,
  value: unknown,
  keys: Set<string>,
): void {
  const at = "dockerProfile";
  if (!isObj(value)) return c.add(`${at} must be an object`);
  c.requiredString(value, "image", at);
  if (!isObj(value.env)) c.add(`${at}.env must be an object`);
  else c.stringRecord(value.env, `${at}.env`);
  c.optionalBoolean(value, "stdinOpen", at);
  c.optionalString(value, "user", at);
  c.optionalString(value, "command", at);
  if (value.mounts !== undefined) {
    if (!Array.isArray(value.mounts)) c.add(`${at}.mounts must be an array`);
    else
      value.mounts.forEach((m, i) => {
        const mAt = `${at}.mounts[${i}]`;
        if (!isObj(m)) return c.add(`${mAt} must be an object`);
        c.requiredString(m, "host", mAt);
        if (!isStr(m.container) || !m.container.startsWith("/"))
          c.add(`${mAt}.container must be an absolute path`);
      });
  }
  if (value.platforms !== undefined) {
    if (!Array.isArray(value.platforms))
      c.add(`${at}.platforms must be an array`);
    else
      for (const p of value.platforms)
        if (!isStr(p) || !DOCKER_PLATFORM_PATTERN.test(p))
          c.add(
            `${at}.platforms entry "${String(p)}" must look like linux/amd64`,
          );
  }
  if (value.stop !== undefined) checkStop(c, value.stop, `${at}.stop`, keys);
  if (value.install !== undefined)
    checkSteps(c, value.install, `${at}.install`);
}

function checkConfigFiles(c: Collector, value: unknown): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) return c.add("configFiles must be an array");
  value.forEach((f, i) => {
    const at = `configFiles[${i}]`;
    if (!isObj(f)) return c.add(`${at} must be an object`);
    if (!isStr(f.path) || !isSafeRelativePath(f.path))
      c.add(`${at}.path must be a relative path inside the server folder`);
    if (!CONFIG_PARSERS.includes(f.parser as string))
      c.add(`${at}.parser must be one of ${CONFIG_PARSERS.join(", ")}`);
    c.optionalString(f, "label", at);
  });
}
