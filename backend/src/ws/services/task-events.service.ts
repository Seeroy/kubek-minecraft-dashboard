import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { Injectable } from "@nestjs/common";
import { ITask } from "@shared/types/task.types";
import { WsTaskEventsTypes } from "@shared/types/ws/task-events.types";

@Injectable()
export class TasksEventsService {
  constructor(private readonly broadcast: ServerBroadcastService) {}

  emitTaskUpdate(task: ITask) {
    this.broadcast.emitToRoom(
      `user:${task.ownerId}`,
      WsTaskEventsTypes.TASK_UPDATE,
      task,
    );
  }

  emitTaskDone(task: ITask) {
    this.broadcast.emitToRoom(
      `user:${task.ownerId}`,
      WsTaskEventsTypes.TASK_DONE,
      task,
    );
  }

  emitTaskFailed(task: ITask) {
    this.broadcast.emitToRoom(
      `user:${task.ownerId}`,
      WsTaskEventsTypes.TASK_FAILED,
      task,
    );
  }
}
