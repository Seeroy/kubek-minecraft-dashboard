import { DatabaseModule } from "@/modules/database/database.module";
import { ErrorRecognitionModule } from "@/modules/error-recognition/error-recognition.module";
import { InstancesModule } from "@/modules/instances/instances.module";
import { JavaModule } from "@/modules/java/java.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { ServerBootService } from "@/modules/servers/server-boot.service";
import { ServerCoreChanger } from "@/modules/servers/server-core-changer";
import { ServerDeletionService } from "@/modules/servers/server-deletion.service";
import { ServerIconController } from "@/modules/servers/server-icon.controller";
import { ServerIconService } from "@/modules/servers/server-icon.service";
import { ServerSettingsController } from "@/modules/servers/server-settings.controller";
import { ServerTransfer } from "@/modules/servers/server-transfer";
import { ServerTransferController } from "@/modules/servers/server-transfer.controller";
import { ServersController } from "@/modules/servers/servers.controller";
import { ServersFactory } from "@/modules/servers/servers.factory";
import { ServersService } from "@/modules/servers/servers.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    DatabaseModule,
    JavaModule,
    InstancesModule,
    ErrorRecognitionModule,
    ServerTypesModule,
  ],
  controllers: [
    ServersController,
    ServerSettingsController,
    ServerTransferController,
    ServerIconController,
  ],
  providers: [
    ServersService,
    ServerBootService,
    ServerDeletionService,
    ServersFactory,
    ServerCoreChanger,
    ServerTransfer,
    ServerIconService,
  ],
  exports: [ServersService, ServersFactory],
})
export class ServersModule {}
