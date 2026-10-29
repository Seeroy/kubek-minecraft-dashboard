import { NetworksRepository } from "@/modules/database/repositories/networks.repository";
import { ServerFoldersService } from "@/modules/server-folders/server-folders.service";
import { ServersFactory } from "@/modules/servers/servers.factory";
import { type StageSpec, TaskStageTracker } from "@/modules/tasks/task-stages";
import { TasksService } from "@/modules/tasks/tasks.service";
import { Injectable, Logger } from "@nestjs/common";
import type {
  NetworkChangeResult,
  NetworkPlan,
  NetworkPlanNote,
  NetworkWizardProps,
} from "@shared/types/network.types";
import type { IServer } from "@shared/types/server/server.types";
import { type ITask, TaskType } from "@shared/types/task.types";
import type { IUser } from "@shared/types/user.types";
import { FabricProxyInstaller } from "../forwarding/fabric-proxy-installer.service";
import { forwardingFor } from "../forwarding/forwarding-registry";
import { NetworkContextService } from "../network-context.service";
import { readSecret } from "../network-files";
import {
  type DraftBackend,
  draftEdits,
  fileChanges,
  type NetworkDraft,
  needsRestart,
} from "../plan/network-draft";
import { generateSecret } from "../plan/network-naming";
import { NewServerCreator } from "./new-server-creator.service";
import type { NewServerSpec, WizardSpec } from "./wizard-spec.service";
import { WizardSpecService } from "./wizard-spec.service";

const CONFIGS_STAGE = "configs";
// A new server downloads a core and maybe Java, it outweighs a config write
const SERVER_WEIGHT = 4;
const fabricStage = (name: string) => `fabric:${name}`;

/** Review and apply of the network wizard */
@Injectable()
export class NetworkWizardService {
  private readonly logger = new Logger(NetworkWizardService.name);

  constructor(
    private readonly specs: WizardSpecService,
    private readonly context: NetworkContextService,
    private readonly networks: NetworksRepository,
    private readonly creator: NewServerCreator,
    private readonly factory: ServersFactory,
    private readonly fabricProxy: FabricProxyInstaller,
    private readonly tasks: TasksService,
    private readonly folders: ServerFoldersService,
  ) {}

  async preview(props: NetworkWizardProps, user: IUser): Promise<NetworkPlan> {
    const spec = await this.specs.resolve(props, user);
    const draft = await this.draft(spec, new Map());
    const edits = await draftEdits(draft, draft.backends, this.context.filesOf);
    return {
      forwardingMode: spec.mode,
      changes: fileChanges(edits, draft.secret),
      notes: await this.notes(spec, draft),
      restart: needsRestart(edits),
    };
  }

  async create(props: NetworkWizardProps, user: IUser): Promise<ITask> {
    const spec = await this.specs.resolve(props, user);
    return this.tasks.runTask(
      TaskType.NETWORK_CREATE,
      user.id,
      (taskId) => this.apply(spec, user, taskId),
      { serverName: spec.name },
    );
  }

  private async apply(
    spec: WizardSpec,
    user: IUser,
    taskId: string,
  ): Promise<NetworkChangeResult> {
    const stages = new TaskStageTracker(
      this.tasks,
      taskId,
      await this.stagesFor(spec),
    );
    const created = new Map<string, IServer>();
    try {
      await this.createServers(spec, user, stages, created);
      const draft = await this.draft(spec, created);
      await this.installFabricProxy(draft, user, stages);

      stages.start(CONFIGS_STAGE);
      const edits = await draftEdits(
        draft,
        draft.backends,
        this.context.filesOf,
      );
      await this.context.write(edits);

      const network = this.networks.create(
        {
          name: spec.name,
          proxyServerId: draft.proxy.serverId!,
          forwardingMode: spec.mode,
        },
        draft.backends.map((b) => ({
          serverId: b.serverId!,
          alias: b.alias,
          tryOrder: b.tryOrder,
        })),
      );
      this.groupInFolder(spec.name, [
        draft.proxy.serverId!,
        ...draft.backends.map((b) => b.serverId!),
      ]);
      stages.done(CONFIGS_STAGE);
      return { networkId: network.id, restart: needsRestart(edits) };
    } catch (error) {
      stages.failRunning();
      for (const server of created.values())
        this.factory.discardCreated(server.id);
      throw error;
    }
  }

  // The network already exists, a folder hiccup must not undo it
  private groupInFolder(name: string, serverIds: string[]): void {
    try {
      this.folders.collect(name, serverIds);
    } catch (error) {
      this.logger.warn(`Could not group network "${name}": ${String(error)}`);
    }
  }

  // Known before anything runs, so the client lists every stage from the start
  private async stagesFor(spec: WizardSpec): Promise<StageSpec[]> {
    const planned = await this.draft(spec, new Map());
    return [
      ...("create" in spec.proxy
        ? [
            {
              key: spec.proxy.create.ref,
              kind: "proxy",
              name: spec.proxy.create.name,
              weight: SERVER_WEIGHT,
            },
          ]
        : []),
      ...spec.created.map((item) => ({
        key: item.ref,
        kind: "server",
        name: item.name,
        weight: SERVER_WEIGHT,
      })),
      ...planned.backends
        .filter((backend) => backend.forwarding.kind === "fabric")
        .map((backend) => ({
          key: fabricStage(backend.name),
          kind: "fabricProxy",
          name: backend.name,
        })),
      { key: CONFIGS_STAGE, kind: "networkConfigs", name: spec.name },
    ];
  }

  private async createServers(
    spec: WizardSpec,
    user: IUser,
    stages: TaskStageTracker,
    created: Map<string, IServer>,
  ) {
    const queue: NewServerSpec[] = [
      ...("create" in spec.proxy ? [spec.proxy.create] : []),
      ...spec.created,
    ];
    for (const item of queue) {
      stages.start(item.ref);
      const server = await this.creator.create(item, user.id, (task) =>
        stages.update(item.ref, { progress: task.progress, step: task.step }),
      );
      created.set(item.ref, server);
      stages.done(item.ref);
    }
  }

  private async installFabricProxy(
    draft: NetworkDraft,
    user: IUser,
    stages: TaskStageTracker,
  ) {
    for (const backend of draft.backends) {
      if (backend.forwarding.kind !== "fabric") continue;
      stages.start(fabricStage(backend.name));
      const server = this.context.requireServer(backend.serverId!);
      await this.fabricProxy.ensure(server, backend.gameVersion, user.id);
      stages.done(fabricStage(backend.name));
    }
  }

  // Specs of servers not created yet stand in with a null id
  private async draft(
    spec: WizardSpec,
    created: Map<string, IServer>,
  ): Promise<NetworkDraft> {
    const proxy =
      "server" in spec.proxy
        ? await this.context.draftProxy(spec.proxy.server)
        : await this.newProxy(spec.proxy.create, created);

    const backends: DraftBackend[] = [];
    for (const item of spec.existing) {
      backends.push(
        await this.context.draftBackend(item.server, item.alias, item.tryOrder),
      );
    }
    for (const item of spec.created) {
      const server = created.get(item.ref);
      backends.push(
        server
          ? await this.context.draftBackend(server, item.alias, item.tryOrder)
          : {
              ...this.placeholder(item),
              alias: item.alias,
              tryOrder: item.tryOrder,
              forwarding: forwardingFor(item.blueprintId)!,
            },
      );
    }

    const secret =
      (proxy.serverId && (await readSecret(proxy.serverId))) ||
      generateSecret();
    return {
      proxy,
      backends,
      mode: spec.mode,
      secret,
      settings: spec.proxySettings,
    };
  }

  private async newProxy(item: NewServerSpec, created: Map<string, IServer>) {
    const server = created.get(item.ref);
    if (server) return this.context.draftProxy(server);
    return { ...this.placeholder(item), docker: item.runtime === "docker" };
  }

  private placeholder(item: NewServerSpec) {
    return {
      serverId: null,
      name: item.name,
      blueprintId: item.blueprintId,
      gameVersion: item.version,
      port: item.port,
      running: false,
    };
  }

  private async notes(
    spec: WizardSpec,
    draft: NetworkDraft,
  ): Promise<NetworkPlanNote[]> {
    const notes: NetworkPlanNote[] = [];
    const fresh = [
      ...("create" in spec.proxy ? [spec.proxy.create] : []),
      ...spec.created,
    ];
    for (const item of fresh) {
      notes.push({
        code: "new_server",
        serverName: item.name,
        blueprintId: item.blueprintId,
        port: item.port,
      });
    }
    for (const backend of draft.backends) {
      if (backend.forwarding.kind !== "fabric") continue;
      const installed = backend.serverId
        ? await this.isInstalled(backend.serverId)
        : false;
      if (!installed)
        notes.push({ code: "install_fabric_proxy", serverName: backend.name });
    }
    if (spec.legacyBecause.length)
      notes.push({ code: "legacy_forced", serverNames: spec.legacyBecause });
    if (spec.mode === "legacy") notes.push({ code: "legacy_insecure" });
    return notes;
  }

  private async isInstalled(serverId: string): Promise<boolean> {
    try {
      return await this.fabricProxy.isInstalled(serverId);
    } catch (error) {
      this.logger.warn(`FabricProxy-Lite lookup failed: ${String(error)}`);
      return false;
    }
  }
}
