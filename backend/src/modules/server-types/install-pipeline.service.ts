import { Branding } from "@/core/constants/branding";
import { unpack } from "@/core/utils/archives";
import { download, progressThrottle } from "@/core/utils/download";
import { getErrorMessage } from "@/core/utils/error";
import { isRealInside } from "@/core/utils/paths";
import { getServerPath } from "@/core/utils/serverPath";
import { JavaService } from "@/modules/java/java.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import type {
  ExecStep,
  InstallStep,
  KubekPlatform,
  SteamCmdStep,
} from "@kubekpanel/blueprint-sdk";
import { Injectable, Logger } from "@nestjs/common";
import type { IServer } from "@shared/types/server/server.types";
import { TaskSteps } from "@shared/types/task.types";
import fs from "fs";
import path from "path";
import { BlueprintResolver } from "./blueprint-resolver.service";
import { assertCommandValuesSafe } from "./launch-args";
import { DockerService } from "./runtime/docker.service";
import { runProcess, shellArgv } from "./runtime/run-process";
import type { LoadedBlueprint, ResolveScope } from "./server-types.types";
import { SteamCmdService } from "./steamcmd/steamcmd.service";
import { VersionResolverService } from "./versions/version-resolver.service";

const DOWNLOAD_URL_TOKEN = /\{\{\s*DOWNLOAD_URL\s*\}\}/;
const JAVA_BIN_TOKEN = /\{\{\s*JAVA_BIN\s*\}\}/;

export interface InstallOptions {
  /**
   * Skip writeFile/template steps whose target already exists
   */
  skipExistingFiles?: boolean;
}

/**
 * Executes a blueprint's install.steps into the server directory
 */
@Injectable()
export class InstallPipeline {
  private readonly logger = new Logger(InstallPipeline.name);
  private static readonly PROGRESS_INTERVAL = 200;

  constructor(
    private readonly versions: VersionResolverService,
    private readonly resolver: BlueprintResolver,
    private readonly javaService: JavaService,
    private readonly tasks: TasksService,
    private readonly dockerService: DockerService,
    private readonly steamCmd: SteamCmdService,
  ) {}

  async run(
    blueprint: LoadedBlueprint,
    server: IServer,
    taskId?: string,
    opts: InstallOptions = {},
  ): Promise<Record<string, string>> {
    const manifest = blueprint.manifest;
    let pinned: Record<string, string> = {};
    const dir = path.resolve(getServerPath(server.id));
    fs.mkdirSync(dir, { recursive: true });

    const scope = this.resolver.buildScope(manifest, {
      serverId: server.id,
      serverName: server.name,
      variables: server.variables,
    });

    // Docker installs pull the image instead of fetching Java and a jar, container runs them itself
    const docker = server.runtimeKind === "docker";
    if (docker) {
      await this.dockerService.assertAvailable();
      this.dockerService.assertProfileUsable(manifest);
    }
    const steps = docker
      ? this.dockerInstallSteps(manifest)
      : manifest.install.steps;
    const text = JSON.stringify(steps);
    if (!docker || JAVA_BIN_TOKEN.test(text)) {
      await this.ensureJava(blueprint, scope, taskId, server);
    }
    if (DOWNLOAD_URL_TOKEN.test(text)) {
      pinned = await this.resolveDownloadUrl(blueprint, scope);
    }
    for (const step of steps) {
      await this.runStep(step, blueprint, dir, scope, taskId, opts);
    }

    // Minecraft bootstrap: drop the default favicon when the blueprint targets minecraft
    if (manifest.game === "minecraft") this.ensureDefaultIcon(dir);
    return pinned;
  }

  /** Install steps for docker mode, defaults to a single dockerPull of the profile image */
  private dockerInstallSteps(
    manifest: LoadedBlueprint["manifest"],
  ): InstallStep[] {
    const profile = manifest.dockerProfile;
    if (!profile) return [];
    if (profile.install) return profile.install;
    return [{ type: "dockerPull", image: profile.image }];
  }

  /** Install the managed Java declared via JAVA_VERSION so it is present before launch */
  private async ensureJava(
    blueprint: LoadedBlueprint,
    scope: ResolveScope,
    taskId?: string,
    server?: IServer,
  ): Promise<void> {
    // A custom JAVA_PATH override skips managed provisioning, just check it works
    const customJava = server?.variables?.JAVA_PATH;
    if (typeof customJava === "string" && customJava.trim()) {
      const binary = await this.javaService.resolveJavaBinary(
        customJava.trim(),
      );
      if (!binary)
        throw new Error(`No java binary found at ${customJava.trim()}`);
      scope.JAVA_BIN = path.resolve(binary);
      return;
    }

    const version = this.resolver.javaVersion(blueprint.manifest, scope);
    if (!version) return;

    if (taskId)
      this.tasks.updateTask(taskId, {
        step: TaskSteps.CHECKING_JAVA,
        progress: 0,
      });

    let javaPath = await this.javaService.getManagedJavaPath(version);
    if (!javaPath) {
      // Pass the create task so its DOWNLOADING_JAVA / UNPACKING_JAVA steps and
      // download progress surface in the UI, but keep manageTaskLifecycle off so
      // the Java installer does not mark the create task complete early
      const result = await this.javaService.installJavaVersion(
        version,
        taskId,
        undefined,
        {
          manageTaskLifecycle: false,
        },
      );
      javaPath = result.success ? (result.path ?? null) : null;
    }
    if (!javaPath) throw new Error(`Failed to provision Java ${version}`);
    // exec steps use it to run installers
    scope.JAVA_BIN = path.resolve(javaPath);
  }

  /** Resolve {{DOWNLOAD_URL}}, returns empty variables the resolver filled in */
  private async resolveDownloadUrl(
    blueprint: LoadedBlueprint,
    scope: ResolveScope,
  ): Promise<Record<string, string>> {
    const pinned: Record<string, string> = {};
    if (blueprint.manifest.versions.kind === "none") return pinned;

    const version = String(scope.GAME_VERSION ?? "");
    const spec = await this.versions.resolveDownload(blueprint, version, scope);
    scope.DOWNLOAD_URL = spec.url;
    if (spec.unpack) scope.__downloadUnpack = true;
    const declared = new Set(
      (blueprint.manifest.variables ?? []).map((v) => v.key),
    );
    for (const [key, value] of Object.entries(spec.vars ?? {})) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(key)) continue;
      // An empty variable takes what was resolved, like the newest loader
      if (declared.has(key) && String(scope[key] ?? "") === "") {
        scope[key] = String(value);
        pinned[key] = String(value);
        continue;
      }
      // Can't override set variables or panel values
      if (key in scope) continue;
      scope[key] = String(value);
    }
    return pinned;
  }

  private async runStep(
    step: InstallStep,
    blueprint: LoadedBlueprint,
    dir: string,
    scope: ResolveScope,
    taskId?: string,
    opts: InstallOptions = {},
  ): Promise<void> {
    switch (step.type) {
      case "download":
        return this.runDownload(step, dir, scope, taskId);
      case "writeFile": {
        const target = await this.within(
          dir,
          this.resolver.substitute(step.path, scope),
        );
        // Preserve user-edited files when re-provisioning an existing server
        if (opts.skipExistingFiles && fs.existsSync(target)) return;
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, this.resolver.substitute(step.content, scope));
        return;
      }
      case "chmod": {
        const target = await this.within(
          dir,
          this.resolver.substitute(step.path, scope),
        );
        fs.chmodSync(target, parseInt(step.mode, 8));
        return;
      }
      case "template": {
        const target = await this.within(
          dir,
          this.resolver.substitute(step.dest, scope),
        );
        if (opts.skipExistingFiles && fs.existsSync(target)) return;
        const src = await this.within(
          blueprint.dir,
          this.resolver.substitute(step.src, scope),
        );
        const content = this.resolver.substitute(
          fs.readFileSync(src, "utf-8"),
          scope,
        );
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
        return;
      }
      case "dockerPull":
        return this.runDockerPull(step, scope, taskId);
      case "exec":
        return this.runExec(step, dir, scope, taskId);
      case "steamcmd":
        return this.runSteamCmd(step, dir, scope, taskId);
      default:
        throw new Error(
          `Unsupported install step: ${(step as { type: string }).type}`,
        );
    }
  }

  // Blueprint paths and variable values can carry ../ or lead through a symlink
  private async within(base: string, relPath: string): Promise<string> {
    const target = path.join(base, relPath);
    if (!(await isRealInside(base, target, true))) {
      throw new Error(`Install step path leaves its folder: ${relPath}`);
    }
    return target;
  }

  private async runDownload(
    step: Extract<InstallStep, { type: "download" }>,
    dir: string,
    scope: ResolveScope,
    taskId?: string,
  ): Promise<void> {
    const url = this.resolver.substitute(step.url, scope);
    if (!url) throw new Error("Download step has no resolved URL");

    const dest = await this.within(
      dir,
      this.resolver.substitute(step.dest, scope),
    );
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (taskId) {
      this.tasks.updateTask(taskId, {
        step: TaskSteps.DOWNLOADING_CORE,
        progress: 0,
      });
    }

    const ready = progressThrottle(InstallPipeline.PROGRESS_INTERVAL);
    await download({
      url,
      dest,
      onProgress: (progress) => {
        if (taskId && ready()) this.tasks.updateTask(taskId, { progress });
      },
    });

    // The resolver unpack flag is about its own file only
    const resolvedUnpack =
      !!scope.__downloadUnpack && DOWNLOAD_URL_TOKEN.test(step.url);
    if (step.unpack || resolvedUnpack) {
      // Broken download fails the install instead of an empty server
      try {
        await unpack(dest, dir, { deleteAfter: true });
      } catch (e: unknown) {
        throw new Error(
          `Failed to unpack ${path.basename(dest)}: ${getErrorMessage(e)}`,
          { cause: e },
        );
      }
    }
  }

  /** exec step, runs in the server folder */
  private async runExec(
    step: ExecStep,
    dir: string,
    scope: ResolveScope,
    taskId?: string,
  ): Promise<void> {
    const template =
      step.commandByPlatform?.[process.platform as KubekPlatform] ??
      step.command;
    if (!template) {
      throw new Error(`Install command has no variant for ${process.platform}`);
    }
    assertCommandValuesSafe(template, scope);
    const command = this.resolver.substitute(template, scope);
    if (taskId) {
      this.tasks.updateTask(taskId, { step: TaskSteps.RUNNING_INSTALLER });
    }

    const ready = progressThrottle(InstallPipeline.PROGRESS_INTERVAL);
    const timeoutSec = step.timeoutSec ?? 900;
    const result = await runProcess({
      argv: shellArgv(command),
      cwd: dir,
      timeoutMs: timeoutSec * 1000,
      windowsVerbatimArguments: process.platform === "win32",
      onLine: (line) => {
        if (taskId && ready()) this.tasks.updateTask(taskId, { message: line });
      },
    });
    if (result.timedOut) {
      throw new Error(`Install command did not finish in ${timeoutSec}s`);
    }
    if (result.code !== 0) {
      throw new Error(
        `Install command failed with code ${result.code}:\n${result.tail.slice(-10).join("\n")}`,
      );
    }
  }

  /** steamcmd step, installs or updates the app in the server folder */
  private async runSteamCmd(
    step: SteamCmdStep,
    dir: string,
    scope: ResolveScope,
    taskId?: string,
  ): Promise<void> {
    const sub = (value?: string) =>
      value === undefined ? undefined : this.resolver.substitute(value, scope);
    if (taskId) {
      this.tasks.updateTask(taskId, {
        step: TaskSteps.DOWNLOADING_GAME,
        progress: 0,
      });
    }

    const ready = progressThrottle(InstallPipeline.PROGRESS_INTERVAL);
    await this.steamCmd.installApp(
      {
        appId: sub(step.appId) ?? "",
        beta: sub(step.beta) || undefined,
        betaPassword: sub(step.betaPassword) || undefined,
        platform: step.platform,
        validate: step.validate,
      },
      dir,
      (progress) => {
        if (!taskId || !ready()) return;
        this.tasks.updateTask(taskId, {
          progress: Math.floor(progress.percent),
          message: progress.phase,
        });
      },
    );
    if (taskId) this.tasks.updateTask(taskId, { progress: 100 });
  }

  /** Pull a docker image, surfacing per-layer progress on the task */
  private async runDockerPull(
    step: Extract<InstallStep, { type: "dockerPull" }>,
    scope: ResolveScope,
    taskId?: string,
  ): Promise<void> {
    await this.dockerService.assertAvailable();
    const image = this.resolver.substitute(step.image, scope);
    const docker = this.dockerService.getDocker();

    if (taskId) {
      this.tasks.updateTask(taskId, {
        step: TaskSteps.PULLING_IMAGE,
        progress: 0,
      });
    }

    const stream = await docker.pull(image);

    // A pull streams many per-layer events, each with its own phase and counters
    // TOTALLY VIBECODED
    const layerStatus = new Map<string, string>();
    const done = new Set([
      "Pull complete",
      "Already exists",
      "Download complete",
    ]);
    const ready = progressThrottle(InstallPipeline.PROGRESS_INTERVAL);
    let lastProgress = 0;
    let lastLine = "";

    await new Promise<void>((resolve, reject) => {
      docker.modem.followProgress(
        stream,
        (err) => (err ? reject(err) : resolve()),
        (event: { id?: string; status?: string; progress?: string }) => {
          if (!taskId || !event.status) return;
          if (event.id) layerStatus.set(event.id, event.status);

          const shortId = event.id ? event.id.slice(0, 12) : "";
          lastLine = [event.status, shortId, event.progress]
            .filter(Boolean)
            .join(" ");

          const total = layerStatus.size;
          const completed = [...layerStatus.values()].filter((s) =>
            done.has(s),
          ).length;
          // Cap below 100 until followProgress signals completion, never go backwards
          const raw = total ? Math.round((completed / total) * 95) : 0;
          lastProgress = Math.max(lastProgress, raw);

          if (!ready()) return;
          this.tasks.updateTask(taskId, {
            progress: lastProgress,
            message: lastLine,
          });
        },
      );
    });
    if (taskId) this.tasks.updateTask(taskId, { progress: 100 });
  }

  /** Write the branding favicon if the server has none yet */
  private ensureDefaultIcon(dir: string): void {
    const iconPath = path.join(dir, "server-icon.png");
    if (fs.existsSync(iconPath)) return;
    fs.writeFileSync(iconPath, Buffer.from(Branding.Base64Icon, "base64"));
  }
}
