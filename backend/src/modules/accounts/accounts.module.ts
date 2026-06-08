import { DatabaseModule } from "@/modules/database/database.module";
import { Global, Module } from "@nestjs/common";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";

/**
 * Accounts module for managing user accounts
 */
@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
