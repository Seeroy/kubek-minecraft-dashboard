import { JavaModule } from "@/modules/java/java.module";
import { Module } from "@nestjs/common";
import { BlueprintResolver } from "./blueprint-resolver.service";
import { InstallPipeline } from "./install-pipeline.service";
import { MinecraftJavaQuery } from "./query-protocols/minecraft-java.query";
import { NoneQuery } from "./query-protocols/none.query";
import { QueryRegistry } from "./query-protocols/query-registry.service";
import { ServerTypesInstaller } from "./server-types-installer.service";
import { ServerTypesRegistry } from "./server-types-registry.service";
import { ServerTypesController } from "./server-types.controller";
import { HttpEngine } from "./versions/http-engine.service";
import { ResolverRunner } from "./versions/resolver-runner.service";
import { VersionResolverService } from "./versions/version-resolver.service";

@Module({
  imports: [JavaModule],
  controllers: [ServerTypesController],
  providers: [
    ServerTypesRegistry,
    BlueprintResolver,
    HttpEngine,
    ResolverRunner,
    VersionResolverService,
    InstallPipeline,
    ServerTypesInstaller,
    MinecraftJavaQuery,
    NoneQuery,
    QueryRegistry,
  ],
  exports: [
    ServerTypesRegistry,
    BlueprintResolver,
    VersionResolverService,
    InstallPipeline,
    QueryRegistry,
  ],
})
export class ServerTypesModule {}
