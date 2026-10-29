import { Module } from "@nestjs/common";
import { ModrinthClient } from "./modrinth-client.service";

@Module({
  providers: [ModrinthClient],
  exports: [ModrinthClient],
})
export class ModrinthModule {}
