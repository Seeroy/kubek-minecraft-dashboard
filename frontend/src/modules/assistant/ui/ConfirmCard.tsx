"use client";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { Button } from "@/shared/ui/button";
import { Plate } from "@/shared/ui/plate";
import type { AssistantToolCall } from "@shared/types/assistant.types";
import { ShieldQuestion } from "lucide-react";
import { useConfirmCall } from "../api/assistant.queries";
import { useToolLabel } from "./ToolCallCard";
import { ToolPreview } from "./ToolPreview";

/** A write call waiting for the user, nothing runs until "Run" is pressed */
export function ConfirmCard({ conversationId, call, serverName }: { conversationId: string; call: AssistantToolCall; serverName?: string }) {
  const { t } = useTranslation("modules.assistant.confirm");
  const label = useToolLabel();
  const { notify } = useNotifications();
  const confirm = useConfirmCall(conversationId);

  const decide = (approve: boolean) =>
    confirm.mutate({ callId: call.id, approve }, { onError: (error) => notify({ type: "error", title: getApiErrorMessage(error) }) });

  return (
    <div className="grid animate-pop-in gap-3 rounded-xl border border-tone/30 bg-tone/8 p-3 tone-amber">
      <div className="flex items-center gap-2.5">
        <Plate size="sm" tone="amber">
          <ShieldQuestion />
        </Plate>
        <div className="min-w-0 text-[13px]">
          <div className="font-medium">{label(call.name)}</div>
          <div className="text-xs text-muted-foreground">{serverName ? t("onServer", serverName) : t("needsApproval")}</div>
        </div>
      </div>
      {call.preview && <ToolPreview preview={call.preview} />}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled={confirm.isPending} onClick={() => decide(false)}>
          {t("cancel")}
        </Button>
        <Button size="sm" disabled={confirm.isPending} onClick={() => decide(true)}>
          {t("run")}
        </Button>
      </div>
    </div>
  );
}
