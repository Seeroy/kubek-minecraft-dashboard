import { BackupsModule } from "@/modules/backups/backups.module";
import { ConfigModule } from "@/modules/config/config.module";
import { FilesModule } from "@/modules/files/files.module";
import { MetricsHistoryModule } from "@/modules/metrics-history/metrics-history.module";
import { ModsModule } from "@/modules/mods/mods.module";
import { PlayersModule } from "@/modules/players/players.module";
import { PluginsModule } from "@/modules/plugins/plugins.module";
import { ScheduledTasksModule } from "@/modules/scheduled-tasks/scheduled-tasks.module";
import { ServerLogsModule } from "@/modules/server-logs/server-logs.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { Module } from "@nestjs/common";
import { AssistantSettingsController } from "./assistant-settings.controller";
import { AssistantController } from "./assistant.controller";
import { ConversationsRepository } from "./conversations/conversations.repository";
import { ConversationsService } from "./conversations/conversations.service";
import { MessagesRepository } from "./conversations/messages.repository";
import { AgentRunnerService } from "./runner/agent-runner.service";
import { AssistantProviderService } from "./settings/assistant-provider.service";
import { AssistantSettingsService } from "./settings/assistant-settings.service";
import { BackupsTools } from "./tools/backups.tools";
import { ConsoleTools } from "./tools/console.tools";
import { ContentTools } from "./tools/content.tools";
import { FilesTools } from "./tools/files.tools";
import { PlayersTools } from "./tools/players.tools";
import { PropertiesTools } from "./tools/properties.tools";
import { SchedulerTools } from "./tools/scheduler.tools";
import { ServersTools } from "./tools/servers.tools";
import {
  TOOL_GROUPS,
  ToolRegistryService,
} from "./tools/tool-registry.service";
import type { ToolGroup } from "./tools/tool.types";

const GROUPS = [
  ServersTools,
  ConsoleTools,
  FilesTools,
  PropertiesTools,
  ContentTools,
  BackupsTools,
  SchedulerTools,
  PlayersTools,
];

@Module({
  imports: [
    ConfigModule,
    ServersModule,
    ServerTypesModule,
    FilesModule,
    ServerLogsModule,
    MetricsHistoryModule,
    PluginsModule,
    ModsModule,
    BackupsModule,
    ScheduledTasksModule,
    PlayersModule,
  ],
  controllers: [AssistantSettingsController, AssistantController],
  providers: [
    ...GROUPS,
    {
      provide: TOOL_GROUPS,
      useFactory: (...groups: ToolGroup[]) => groups,
      inject: GROUPS,
    },
    ToolRegistryService,
    AssistantSettingsService,
    AssistantProviderService,
    ConversationsRepository,
    MessagesRepository,
    AgentRunnerService,
    ConversationsService,
  ],
  // The registry is transport agnostic, an MCP endpoint can reuse it later
  exports: [ToolRegistryService],
})
export class AssistantModule {}
