import { ServersModule } from "@/modules/servers/servers.module";
import { Global, Module } from "@nestjs/common";
import { ContextFactory } from "./context/context.factory";
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
  imports: [ServersModule],
  controllers: [ExtensionsController, ExtensionDispatchController],
  providers: [
    ExtensionEventBus,
    ExtensionValidator,
    ExtensionLoader,
    ExtensionRegistry,
    ContextFactory,
    InProcessHost,
    ExtensionManager,
  ],
  exports: [ExtensionEventBus, ExtensionRegistry],
})
export class ExtensionsModule {}
