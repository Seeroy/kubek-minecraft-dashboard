import { asyncTimeout } from "@/core/utils/asyncTimeout";
import { getErrorMessage } from "@/core/utils/error";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { LoadedBlueprint } from "@/modules/server-types/server-types.types";
import { VersionResolverService } from "@/modules/server-types/versions/version-resolver.service";
import { ServersService } from "@/modules/servers/servers.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import { Injectable } from "@nestjs/common";
import {
  AuditAction,
  AuditCategory,
  AuditResult,
} from "@shared/types/audit.types";
import type { IServer } from "@shared/types/server/server.types";
import { TaskStatus } from "@shared/types/task.types";
import { InlineKeyboard } from "grammy";
import { BotAccessService } from "./bot-access.service";
import { renderServerStatus } from "./bot-format";
import {
  statusKeyboard,
  wizardBlueprintKeyboard,
  wizardConfirmKeyboard,
  wizardVersionKeyboard,
} from "./bot-keyboards";
import type { MyContext } from "./bot-types";
import { t, type TelegramLang } from "./i18n";

const MAX_VERSIONS = 12;
const PROGRESS_POLL_MS = 1500;
const PROGRESS_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Conversational "create server" flow driven by the Grammy session
 */
@Injectable()
export class CreateServerWizard {
  constructor(
    private readonly servers: ServersService,
    private readonly registry: ServerTypesRegistry,
    private readonly versions: VersionResolverService,
    private readonly tasks: TasksService,
    private readonly access: BotAccessService,
    private readonly audit: AuditLogService,
  ) {}

  isActive(ctx: MyContext): boolean {
    return !!ctx.session.wizard;
  }

  async start(
    ctx: MyContext,
    lang: TelegramLang,
    userId: string,
  ): Promise<void> {
    if (!this.access.canCreate(userId)) {
      await ctx.reply(t(lang, "wizard.noPermission"));
      return;
    }
    ctx.session.wizard = { step: "name" };
    await ctx.reply(t(lang, "wizard.enterName"), { parse_mode: "HTML" });
  }

  /** Handle a text message while the name step is active. Returns true if consumed */
  async onText(
    ctx: MyContext,
    lang: TelegramLang,
    text: string,
  ): Promise<boolean> {
    const wizard = ctx.session.wizard;
    if (!wizard || wizard.step !== "name") return false;

    const name = text.trim();
    if (!name) {
      await ctx.reply(t(lang, "wizard.nameEmpty"));
      return true;
    }
    if (
      this.servers
        .findAll()
        .some((s) => s.name.toLowerCase() === name.toLowerCase())
    ) {
      await ctx.reply(t(lang, "wizard.nameTaken"));
      return true;
    }

    wizard.name = name;
    wizard.step = "blueprint";
    await ctx.reply(t(lang, "wizard.chooseBlueprint"), {
      parse_mode: "HTML",
      reply_markup: wizardBlueprintKeyboard(lang, this.blueprintOptions()),
    });
    return true;
  }

  /** Handle a wiz:* callback. action is the part after wiz: */
  async onCallback(
    ctx: MyContext,
    lang: TelegramLang,
    userId: string,
    action: string,
  ): Promise<void> {
    const wizard = ctx.session.wizard;

    if (action === "cancel") {
      ctx.session.wizard = undefined;
      await this.edit(ctx, t(lang, "wizard.cancelled"));
      return;
    }
    if (action === "start") {
      await this.start(ctx, lang, userId);
      return;
    }
    if (!wizard) return;

    if (action.startsWith("bp:")) {
      const blueprintId = action.slice("bp:".length);
      const blueprint = this.registry.get(blueprintId);
      if (!blueprint) return;
      wizard.blueprintId = blueprintId;
      wizard.blueprintName =
        blueprint.manifest.shortName ?? blueprint.manifest.name;

      await this.edit(ctx, t(lang, "wizard.loadingVersions"));
      const versions = (await this.safeVersions(blueprint)).slice(
        0,
        MAX_VERSIONS,
      );
      if (versions.length === 0) {
        await this.edit(ctx, t(lang, "wizard.noVersions"));
        ctx.session.wizard = undefined;
        return;
      }
      wizard.versions = versions;
      wizard.step = "version";
      await this.edit(
        ctx,
        t(lang, "wizard.chooseVersion"),
        wizardVersionKeyboard(lang, versions),
      );
      return;
    }

    if (action.startsWith("ver:")) {
      const index = Number(action.slice("ver:".length));
      const version = wizard.versions?.[index];
      if (!version) return;
      wizard.version = version;
      wizard.step = "confirm";
      await this.edit(
        ctx,
        t(lang, "wizard.confirm", {
          name: wizard.name,
          blueprint: wizard.blueprintName,
          version,
        }),
        wizardConfirmKeyboard(lang),
      );
      return;
    }

    if (action === "confirm") {
      await this.create(ctx, lang, userId, wizard);
    }
  }

  private async create(
    ctx: MyContext,
    lang: TelegramLang,
    userId: string,
    wizard: NonNullable<MyContext["session"]["wizard"]>,
  ): Promise<void> {
    if (!wizard.name || !wizard.blueprintId || !wizard.version) return;
    if (!this.access.canCreate(userId)) {
      await this.edit(ctx, t(lang, "wizard.noPermission"));
      ctx.session.wizard = undefined;
      return;
    }

    const blueprint = this.registry.get(wizard.blueprintId);
    if (!blueprint) {
      ctx.session.wizard = undefined;
      await this.edit(
        ctx,
        t(lang, "wizard.failed", { error: "unknown blueprint" }),
      );
      return;
    }

    const name = wizard.name;
    const user = this.access.getUser(userId);

    try {
      // Set the chosen version on the blueprint's version variable
      const versionVar = blueprint.manifest.variables.find(
        (v) => v.options?.from === "versions",
      );
      const variables = versionVar ? { [versionVar.key]: wizard.version } : {};
      const { server, taskId } = this.servers.create(
        { name, blueprintId: wizard.blueprintId, variables },
        userId,
      );

      this.audit.record({
        action: AuditAction.SERVER_CREATE,
        category: AuditCategory.SERVER,
        resourceType: "server",
        resourceId: server.id,
        resourceName: server.name,
        result: AuditResult.SUCCESS,
        userId,
        username: user?.username ?? "unknown",
        source: "telegram",
      });

      ctx.session.wizard = undefined;
      await this.edit(ctx, t(lang, "wizard.creating"));
      void this.watchProgress(ctx, lang, server, taskId, userId);
    } catch (e: unknown) {
      ctx.session.wizard = undefined;
      await this.edit(
        ctx,
        t(lang, "wizard.failed", { error: getErrorMessage(e) }),
      );
    }
  }

  // Render an ASCII progress bar
  private progressBar(percent: number): string {
    const total = 16;
    const filled = Math.round(
      (Math.max(0, Math.min(100, percent)) / 100) * total,
    );
    return `[${"█".repeat(filled)}${"░".repeat(total - filled)}]`;
  }

  // Send a progress message and edit it as the creation task updates
  private async watchProgress(
    ctx: MyContext,
    lang: TelegramLang,
    server: IServer,
    taskId: string,
    userId: string,
  ): Promise<void> {
    const name = server.name;
    const sent = await ctx.reply(
      t(lang, "wizard.progress", {
        name,
        bar: this.progressBar(0),
        progress: 0,
      }),
      { parse_mode: "HTML" },
    );
    const chatId = sent.chat.id;
    const messageId = sent.message_id;
    const startedAt = Date.now();
    let lastText = "";

    const editTo = async (text: string, keyboard?: InlineKeyboard) => {
      if (text === lastText) return;
      lastText = text;
      try {
        await ctx.api.editMessageText(chatId, messageId, text, {
          parse_mode: "HTML",
          reply_markup: keyboard,
        });
      } catch {
        // i don`t care
      }
    };

    while (Date.now() - startedAt < PROGRESS_TIMEOUT_MS) {
      const task = this.tasks.getTask(taskId);
      if (!task) break;
      if (task.status === TaskStatus.SUCCESS) {
        const fresh = this.servers.findById(server.id) ?? server;
        await editTo(
          renderServerStatus(lang, fresh),
          statusKeyboard(
            lang,
            fresh.id,
            this.access.canControl(userId, fresh.id),
          ),
        );
        return;
      }
      if (
        task.status === TaskStatus.FAILED ||
        task.status === TaskStatus.CANCELLED
      ) {
        await editTo(
          t(lang, "wizard.failed", { error: task.error?.message ?? "error" }),
        );
        return;
      }
      const progress = task.progress ?? 0;
      await editTo(
        t(lang, "wizard.progress", {
          name,
          bar: this.progressBar(progress),
          progress,
        }),
      );
      await asyncTimeout(PROGRESS_POLL_MS);
    }
  }

  /** Valid blueprints offered in the picker */
  private blueprintOptions() {
    const winLinux =
      process.platform === "win32" || process.platform === "linux";
    return this.registry
      .listValid()
      .filter((b) => {
        if (b.manifest.versions.kind === "none") return false;
        const id = b.manifest.id;
        if ((id.endsWith(".bedrock") || id.endsWith(".beammp")) && !winLinux)
          return false;
        return true;
      })
      .map((b) => ({
        id: b.manifest.id,
        label: b.manifest.shortName ?? b.manifest.name,
      }));
  }

  private async safeVersions(blueprint: LoadedBlueprint): Promise<string[]> {
    try {
      return await this.versions.listVersions(blueprint);
    } catch {
      return [];
    }
  }

  // Edit the message behind a callback; fall back to a reply if editing fails
  private async edit(
    ctx: MyContext,
    text: string,
    keyboard?: InlineKeyboard,
  ): Promise<void> {
    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch {
      await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }
  }
}
