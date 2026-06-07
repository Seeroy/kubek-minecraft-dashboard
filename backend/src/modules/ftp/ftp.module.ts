import { AuthModule } from "@/modules/auth/auth.module";
import { FilesModule } from "@/modules/files/files.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { Module } from "@nestjs/common";
import { FtpService } from "./ftp.service";

@Module({
  imports: [AuthModule, FilesModule, ServersModule],
  providers: [FtpService],
  exports: [FtpService],
})
export class FtpModule {}
