"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Plate } from "@/shared/ui/plate";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowLeft, History, Plus, Sparkles, X } from "lucide-react";
import { useAssistantStatus } from "../api/assistant.queries";
import { useAssistantPanel } from "../lib/panel-store";
import { Chat } from "./Chat";
import { ConversationList } from "./ConversationList";

/** Right slide-over, non modal so the page stays usable next to the chat */
export default function AssistantSheet() {
  const { t } = useTranslation("modules.assistant");
  const open = useAssistantPanel((s) => s.open);
  const setOpen = useAssistantPanel((s) => s.setOpen);
  const view = useAssistantPanel((s) => s.view);
  const conversationId = useAssistantPanel((s) => s.conversationId);
  const showConversation = useAssistantPanel((s) => s.showConversation);
  const showList = useAssistantPanel((s) => s.showList);
  const status = useAssistantStatus().data;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen} modal={false} disablePointerDismissal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup
          aria-label={t("title")}
          className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-popover text-popover-foreground transition-transform duration-300 ease-smooth outline-none data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full motion-reduce:transition-none sm:inset-y-2 sm:right-2 sm:left-auto sm:w-[440px] sm:rounded-xl sm:border sm:border-border sm:shadow-pop sm:data-[ending-style]:translate-x-[calc(100%+1rem)] sm:data-[starting-style]:translate-x-[calc(100%+1rem)]"
        >
          <header className="flex shrink-0 items-center gap-1 border-b border-border py-2.5 pr-2 pl-3">
            {view === "list" ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="-ml-1"
                aria-label={t("back")}
                title={t("back")}
                onClick={() => showConversation(conversationId)}
              >
                <ArrowLeft />
              </Button>
            ) : (
              <Plate size="sm">
                <Sparkles />
              </Plate>
            )}
            <div className="min-w-0 flex-1 px-1.5">
              <DialogPrimitive.Title className="truncate text-[14px] leading-tight font-semibold">
                {view === "list" ? t("history") : t("title")}
              </DialogPrimitive.Title>
              {status?.model && view === "chat" && <p className="truncate font-mono text-[11px] text-muted-foreground">{status.model}</p>}
            </div>
            {view === "chat" && (
              <Button variant="ghost" size="icon-sm" aria-label={t("history")} title={t("history")} onClick={showList}>
                <History />
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" aria-label={t("newChat")} title={t("newChat")} onClick={() => showConversation(null)}>
              <Plus />
            </Button>
            <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" aria-label={t("close")} title={t("close")} />}>
              <X />
            </DialogPrimitive.Close>
          </header>
          {view === "list" ? <ConversationList /> : <Chat conversationId={conversationId} />}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
