import { AccountsModule } from "@/modules/accounts/accounts.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { Module } from "@nestjs/common";
import { FtpService } from "./ftp.service";

@Module({
  imports: [AccountsModule, ServersModule],
  providers: [FtpService],
  exports: [FtpService],
})
export class FtpModule {}
