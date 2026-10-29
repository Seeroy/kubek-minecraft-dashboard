import { DatabaseModule } from "@/modules/database/database.module";
import { JavaModule } from "@/modules/java/java.module";
import { ModsModule } from "@/modules/mods/mods.module";
import { ServerFoldersModule } from "@/modules/server-folders/server-folders.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { Module } from "@nestjs/common";
import { FabricProxyInstaller } from "./forwarding/fabric-proxy-installer.service";
import { NetworkContextService } from "./network-context.service";
import { NetworkMembersService } from "./network-members.service";
import { NetworkPortsService } from "./network-ports.service";
import { NetworksController } from "./networks.controller";
import { NetworksService } from "./networks.service";
import { NetworkWizardService } from "./wizard/network-wizard.service";
import { NewServerCreator } from "./wizard/new-server-creator.service";
import { WizardSpecService } from "./wizard/wizard-spec.service";

@Module({
  imports: [
    DatabaseModule,
    JavaModule,
    ModsModule,
    ServerTypesModule,
    ServersModule,
    ServerFoldersModule,
  ],
  controllers: [NetworksController],
  providers: [
    NetworksService,
    NetworkMembersService,
    NetworkContextService,
    NetworkPortsService,
    NetworkWizardService,
    WizardSpecService,
    NewServerCreator,
    FabricProxyInstaller,
  ],
})
export class NetworksModule {}
