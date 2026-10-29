import { ErrorRecognitionModule } from "@/modules/error-recognition/error-recognition.module";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { ServerInstanceFactory } from "@/modules/instances/server-instance.factory";
import { JavaModule } from "@/modules/java/java.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { Global, Module } from "@nestjs/common";

@Global()
@Module({
  imports: [JavaModule, ErrorRecognitionModule, ServerTypesModule],
  providers: [InstancesRegistry, ServerInstanceFactory],
  exports: [InstancesRegistry, ServerInstanceFactory],
})
export class InstancesModule {}
