import { DatabaseModule } from "@/modules/database/database.module";
import { RolesModule } from "@/modules/roles/roles.module";
import { Global, Module } from "@nestjs/common";
import { AccountFtpPasswordController } from "./account-ftp-password.controller";
import { AccountPreferencesController } from "./account-preferences.controller";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";
import { FtpPasswordService } from "./ftp-password.service";

/**
 * Accounts module for managing user accounts
 */
@Global()
@Module({
  imports: [DatabaseModule, RolesModule],
  controllers: [
    AccountsController,
    AccountPreferencesController,
    AccountFtpPasswordController,
  ],
  providers: [AccountsService, FtpPasswordService],
  exports: [AccountsService, FtpPasswordService],
})
export class AccountsModule {}
