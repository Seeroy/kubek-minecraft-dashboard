import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditLogController } from "./audit-log.controller";
import { AuditLogService } from "./audit-log.service";
import { AuditInterceptor } from "./audit.interceptor";
import { AuditRetentionService } from "./retention/audit-retention.service";

@Global()
@Module({
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    AuditRetentionService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditLogService],
})
export class AuditLogModule {}
