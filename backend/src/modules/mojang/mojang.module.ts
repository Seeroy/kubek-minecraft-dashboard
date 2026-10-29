import { Module } from "@nestjs/common";
import { MojangProfileClient } from "./mojang-profile.client";

@Module({
  providers: [MojangProfileClient],
  exports: [MojangProfileClient],
})
export class MojangModule {}
