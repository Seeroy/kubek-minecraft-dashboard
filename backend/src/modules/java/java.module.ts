import { Module } from "@nestjs/common";
import { JavaController } from "./java.controller";
import { JavaService } from "./java.service";

@Module({
  imports: [],
  controllers: [JavaController],
  providers: [JavaService],
  exports: [JavaService],
})
export class JavaModule {}
