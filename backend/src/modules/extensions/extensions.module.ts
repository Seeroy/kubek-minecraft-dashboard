import { CatalogModule } from "@/modules/catalog/catalog.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { Global, Module } from "@nestjs/common";
import { ContextFactory } from "./context/context.factory";
import { ExtensionCommands } from "./extension-commands.service";
import { ExtensionDispatchController } from "./extension-dispatch.controller";
import { ExtensionEventBus } from "./extension-event-bus.service";
import { ExtensionLoader } from "./extension-loader.service";
import { ExtensionManager } from "./extension-manager.service";
import { ExtensionRegistry } from "./extension-registry.service";
import { ExtensionValidator } from "./extension-validator.service";
import { ExtensionsController } from "./extensions.controller";
import { InProcessHost } from "./isolation/in-process.host";

@Global()
@Module({
  imports: [ServersModule, CatalogModule],
  controllers: [ExtensionsController, ExtensionDispatchController],
  providers: [
    ExtensionEventBus,
    ExtensionValidator,
    ExtensionLoader,
    ExtensionRegistry,
    ContextFactory,
    InProcessHost,
    ExtensionManager,
    ExtensionCommands,
  ],
  exports: [ExtensionEventBus, ExtensionRegistry],
})
export class ExtensionsModule {}
