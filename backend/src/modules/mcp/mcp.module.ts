import { AssistantModule } from "@/modules/assistant/assistant.module";
import { Module } from "@nestjs/common";
import { McpController } from "./mcp.controller";
import { McpService } from "./mcp.service";

@Module({
  imports: [AssistantModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
