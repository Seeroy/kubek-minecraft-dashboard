import { getErrorMessage } from "@/core/utils/error";
import type { KubekExtensionContext } from "@kubekpanel/extension-sdk";
import { Injectable, Logger } from "@nestjs/common";
import type { KubekBackendModule } from "../extensions.types";

/**
 * Runs extension hooks in the panel process, guarded by try/catch so a throwing extension cannot
 * crash the host
 */
@Injectable()
export class InProcessHost {
  private readonly logger = new Logger(InProcessHost.name);

  async activate(
    module: KubekBackendModule,
    ctx: KubekExtensionContext,
  ): Promise<string | null> {
    try {
      await module.activate(ctx);
      return null;
    } catch (e: unknown) {
      const message = getErrorMessage(e);
      this.logger.error(`activate failed for "${ctx.id}": ${message}`);
      return message;
    }
  }

  async deactivate(module: KubekBackendModule, extId: string): Promise<void> {
    if (!module.deactivate) return;
    try {
      await module.deactivate();
    } catch (e: unknown) {
      this.logger.error(
        `deactivate failed for "${extId}": ${getErrorMessage(e)}`,
      );
    }
  }
}
