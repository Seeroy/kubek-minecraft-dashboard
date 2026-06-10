import { Branding } from "@/core/constants/branding";
import { unpackArchive } from "@/core/utils/archives";
import { downloadWithProgress } from "@/core/utils/downloadWithProgress";
import { getServerPath } from "@/core/utils/serverPath";
import { JavaService } from "@/modules/java/java.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import type { InstallStep } from "@kubekpanel/blueprint-sdk";
import { Injectable, Logger } from "@nestjs/common";
import type { IServer } from "@shared/types/server/server.types";
import { TaskSteps } from "@shared/types/task.types";
import fs from "fs";
import path from "path";
import { BlueprintResolver } from "./blueprint-resolver.service";
import { DockerService } from "./runtime/docker.service";
import type { LoadedBlueprint, ResolveScope } from "./server-types.types";
import { VersionResolverService } from "./versions/version-resolver.service";

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
  ) {}

  async run(
    blueprint: LoadedBlueprint,
    server: IServer,
    taskId?: string,
    opts: InstallOptions = {},
  ): Promise<void> {
    const manifest = blueprint.manifest;
    const dir = path.resolve(getServerPath(server.id));
    fs.mkdirSync(dir, { recursive: true });

    const scope = this.resolver.buildScope(manifest, {
      serverId: server.id,
      serverName: server.name,
      variables: server.variables,
    });

    // Docker installs pull the image instead of fetching Java and a jar, container runs them itself
    if (server.runtimeKind === "docker") {
      for (const step of this.dockerInstallSteps(manifest)) {
        await this.runStep(step, blueprint, dir, scope, taskId, opts);
      }
    } else {
      await this.ensureJava(blueprint, scope, taskId);
      await this.resolveDownloadUrl(blueprint, scope);
      for (const step of manifest.install.steps) {
        await this.runStep(step, blueprint, dir, scope, taskId, opts);
      }
    }

    // Minecraft bootstrap: drop the default favicon when the blueprint targets minecraft
    if (manifest.game === "minecraft") this.ensureDefaultIcon(dir);
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
  ): Promise<void> {
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
  }

  /** Resolve {{DOWNLOAD_URL}} from the chosen version when any step downloads it */
  private async resolveDownloadUrl(
    blueprint: LoadedBlueprint,
    scope: ResolveScope,
  ): Promise<void> {
    const needsUrl = blueprint.manifest.install.steps.some(
      (s) => s.type === "download" && s.url.includes("{{DOWNLOAD_URL}}"),
    );
    if (!needsUrl || blueprint.manifest.versions.kind === "none") return;

    const version = String(scope.GAME_VERSION ?? "");
    const spec = await this.versions.resolveDownload(blueprint, version, scope);
    scope.DOWNLOAD_URL = spec.url;
    if (spec.unpack) scope.__downloadUnpack = true;
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
        const target = path.join(
          dir,
          this.resolver.substitute(step.path, scope),
        );
        // Preserve user-edited files when re-provisioning an existing server
        if (opts.skipExistingFiles && fs.existsSync(target)) return;
        fs.writeFileSync(target, this.resolver.substitute(step.content, scope));
        return;
      }
      case "chmod": {
        const target = path.join(
          dir,
          this.resolver.substitute(step.path, scope),
        );
        fs.chmodSync(target, parseInt(step.mode, 8));
        return;
      }
      case "template": {
        const target = path.join(
          dir,
          this.resolver.substitute(step.dest, scope),
        );
        if (opts.skipExistingFiles && fs.existsSync(target)) return;
        const src = path.join(
          blueprint.dir,
          this.resolver.substitute(step.src, scope),
        );
        fs.writeFileSync(
          target,
          this.resolver.substitute(fs.readFileSync(src, "utf-8"), scope),
        );
        return;
      }
      case "dockerPull":
        return this.runDockerPull(step, scope, taskId);
      default:
        throw new Error(`Unsupported install step: ${step.type}`);
    }
  }

  private async runDownload(
    step: Extract<InstallStep, { type: "download" }>,
    dir: string,
    scope: ResolveScope,
    taskId?: string,
  ): Promise<void> {
    const url = this.resolver.substitute(step.url, scope);
    if (!url) throw new Error("Download step has no resolved URL");

    const dest = path.join(dir, this.resolver.substitute(step.dest, scope));
    if (taskId) {
      this.tasks.updateTask(taskId, {
        step: TaskSteps.DOWNLOADING_CORE,
        progress: 0,
      });
    }

    let lastUpdate = 0;
    await downloadWithProgress(url, dest, (progress) => {
      const now = Date.now();
      if (taskId && now - lastUpdate >= InstallPipeline.PROGRESS_INTERVAL) {
        this.tasks.updateTask(taskId, { progress });
        lastUpdate = now;
      }
    });

    if (step.unpack || scope.__downloadUnpack) {
      await unpackArchive(dest, dir, true);
    }
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
    let lastUpdate = 0;
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

          const now = Date.now();
          if (now - lastUpdate < InstallPipeline.PROGRESS_INTERVAL) return;
          lastUpdate = now;
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
