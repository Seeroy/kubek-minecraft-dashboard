import { Global, Module } from "@nestjs/common";
import { PermissionRegistry } from "./permission-registry.service";
import { PermissionsController } from "./permissions.controller";

@Global()
@Module({
  controllers: [PermissionsController],
  providers: [PermissionRegistry],
  exports: [PermissionRegistry],
})
export class PermissionsModule {}
