import { JavaService } from "@/modules/java/java.service";
import { ServersFactory } from "@/modules/servers/servers.factory";
import { TasksService } from "@/modules/tasks/tasks.service";
import { Injectable } from "@nestjs/common";
import type {
  IServer,
  NewServerProps,
} from "@shared/types/server/server.types";
import { type ITask, TaskStatus } from "@shared/types/task.types";
import { VELOCITY_BLUEPRINT_ID } from "../forwarding/forwarding-registry";
import type { NewServerSpec } from "./wizard-spec.service";

/** Creates one wizard server through the regular factory and waits for it */
@Injectable()
export class NewServerCreator {
  constructor(
    private readonly factory: ServersFactory,
    private readonly tasks: TasksService,
    private readonly java: JavaService,
  ) {}

  /** onProgress gets every update of the server creation task */
  async create(
    spec: NewServerSpec,
    ownerId: string,
    onProgress?: (task: ITask) => void,
  ): Promise<IServer> {
    const { server, taskId } = this.factory.prepareServerDataAndCreateServer(
      await this.props(spec),
      ownerId,
    );
    const unwatch = onProgress ? this.tasks.watch(taskId, onProgress) : null;
    const task = await this.tasks.waitFor(taskId).finally(() => unwatch?.());
    if (task.status !== TaskStatus.SUCCESS) {
      throw new Error(
        `${spec.name}: ${task.error?.message ?? "server creation failed"}`,
      );
    }
    return server;
  }

  private async props(spec: NewServerSpec): Promise<NewServerProps> {
    const variables: NewServerProps["variables"] = {
      GAME_VERSION: spec.version,
      game: spec.port,
    };
    if (spec.memory !== undefined) variables.XMX = spec.memory;
    if (spec.jvmArgs) variables.JVM_ARGS = spec.jvmArgs;
    // Velocity versions are not game versions
    if (spec.blueprintId !== VELOCITY_BLUEPRINT_ID) {
      const java = await this.javaFor(spec.version);
      if (java) variables.JAVA_VERSION = java;
    }
    return {
      name: spec.name,
      blueprintId: spec.blueprintId,
      variables,
      runtime: spec.runtime,
    };
  }

  private async javaFor(version: string): Promise<number | null> {
    try {
      return await this.java.getJavaVersionForGame(version);
    } catch {
      return null;
    }
  }
}
