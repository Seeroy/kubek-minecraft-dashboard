import { FileBatchService } from "@/modules/files/file-batch.service";
import { FileManagerService } from "@/modules/files/file-manager.service";
import { FilesTasksService } from "@/modules/files/files-tasks.service";
import { FilesController } from "@/modules/files/files.controller";
import { TasksModule } from "@/modules/tasks/tasks.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [TasksModule],
  controllers: [FilesController],
  providers: [FileManagerService, FileBatchService, FilesTasksService],
  exports: [FileManagerService],
})
export class FilesModule {}
