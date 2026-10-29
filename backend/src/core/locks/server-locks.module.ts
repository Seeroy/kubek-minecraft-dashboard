import { Global, Module } from "@nestjs/common";
import { ServerLocksService } from "./server-locks.service";

@Global()
@Module({
  providers: [ServerLocksService],
  exports: [ServerLocksService],
})
export class ServerLocksModule {}
