import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { Global, Module } from "@nestjs/common";

@Global()
@Module({
  providers: [InstancesRegistry],
  exports: [InstancesRegistry],
})
export class InstancesModule {}
