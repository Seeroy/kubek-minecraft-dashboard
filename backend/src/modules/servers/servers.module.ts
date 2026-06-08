import { DatabaseModule } from "@/modules/database/database.module";
import { ErrorRecognitionModule } from "@/modules/error-recognition/error-recognition.module";
import { InstancesModule } from "@/modules/instances/instances.module";
import { JavaModule } from "@/modules/java/java.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
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
  controllers: [ServersController],
  providers: [ServersService, ServersFactory],
  exports: [ServersService],
})
export class ServersModule {}
