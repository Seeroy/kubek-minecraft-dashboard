import { Module } from "@nestjs/common";
import { CustomJavaStore } from "./custom-java.store";
import { JavaCatalog } from "./java-catalog.service";
import { JavaDiscovery } from "./java-discovery.service";
import { JavaInstaller } from "./java-installer.service";
import { JavaController } from "./java.controller";
import { JavaService } from "./java.service";

@Module({
  imports: [],
  controllers: [JavaController],
  providers: [
    JavaService,
    JavaCatalog,
    JavaDiscovery,
    JavaInstaller,
    CustomJavaStore,
  ],
  exports: [JavaService],
})
export class JavaModule {}
