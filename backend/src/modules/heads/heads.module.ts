import { MojangModule } from "@/modules/mojang/mojang.module";
import { Module } from "@nestjs/common";
import { HeadsController } from "./heads.controller";
import { HeadsService } from "./heads.service";

@Module({
  imports: [MojangModule],
  controllers: [HeadsController],
  providers: [HeadsService],
})
export class HeadsModule {}
