import { DatabaseModule } from "@/modules/database/database.module";
import { ServerFoldersController } from "@/modules/server-folders/server-folders.controller";
import { ServerFoldersService } from "@/modules/server-folders/server-folders.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [DatabaseModule],
  controllers: [ServerFoldersController],
  providers: [ServerFoldersService],
  exports: [ServerFoldersService],
})
export class ServerFoldersModule {}
