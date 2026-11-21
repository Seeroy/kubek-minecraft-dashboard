"use client";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Toggle } from "@/shared/ui/toggle";
import {
  ASSISTANT_ATTACHMENT_LIMITS,
  ASSISTANT_REASONING_LEVELS,
  type AssistantReasoningLevel,
  type IAssistantConversation,
} from "@shared/types/assistant.types";
import { ArrowUp, Brain, Globe, Paperclip, Square, X, Zap } from "lucide-react";
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import { useAssistantStatus, useSendMessage, useStopConversation } from "../api/assistant.queries";
import { AttachmentReadError, fileAccept, isImageFile, readAttachment, type DraftAttachment } from "../lib/attachments";
import { useAssistantPanel } from "../lib/panel-store";
import { useLiveConversation } from "../lib/stream-store";
import { FileChip } from "./MessageExtras";

/** What the chat waits on before the user can write again */
export type ComposerWaiting = false | "action" | "plan" | "question";

const WAITING_HINT = { action: "waiting", plan: "waitingPlan", question: "waitingQuestion" } as const;

interface ComposerProps {
  conversationId: string | null;
  /** Server side running flag, the live store overrides it once events arrive */
  running: boolean;
  /** A write call, a plan or a question waits for the user */
  waiting: ComposerWaiting;
  initialText: string;
  onStarted: (conversation: IAssistantConversation) => void;
}

// Button and Toggle differ in border and tracking, these pin them to the same box
const CHIP_TOGGLE = "h-6 gap-1 rounded-md border-0 px-2 text-[11.5px] tracking-normal";

export function Composer({ conversationId, running, waiting, initialText, onStarted }: ComposerProps) {
  const { t } = useTranslation("modules.assistant.composer");
  const { notify } = useNotifications();
  const { selectedServer } = useServerStore();
  const capabilities = useAssistantStatus().data?.capabilities;
  const live = useLiveConversation(conversationId);
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState<DraftAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const send = useSendMessage(onStarted);
  const stop = useStopConversation();
  const autoApprove = useAssistantPanel((s) => s.autoApprove);
  const setAutoApprove = useAssistantPanel((s) => s.setAutoApprove);
  const reasoning = useAssistantPanel((s) => s.reasoning);
  const setReasoning = useAssistantPanel((s) => s.setReasoning);
  const webSearch = useAssistantPanel((s) => s.webSearch);
  const setWebSearch = useAssistantPanel((s) => s.setWebSearch);
  const busy = (live.running ?? running) || send.isPending;
  const blocked = busy || !!waiting;
  // Unknown counts as able, the provider error says otherwise
  const vision = capabilities?.vision !== false;

  // Previews are object URLs, whatever is still held goes with the composer
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const held = previews.current;
    return () => held.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const release = (file: DraftAttachment) => {
    if (!file.previewUrl) return;
    URL.revokeObjectURL(file.previewUrl);
    previews.current.delete(file.previewUrl);
  };

  const removeFile = (key: string) => {
    const file = files.find((item) => item.key === key);
    if (file) release(file);
    setFiles((list) => list.filter((item) => item.key !== key));
  };

  const addFiles = async (picked: File[]) => {
    const limits = ASSISTANT_ATTACHMENT_LIMITS;
    let images = files.filter((file) => file.kind === "image").length;
    let count = files.length;
    const added: DraftAttachment[] = [];
    for (const file of picked) {
      if (isImageFile(file) && !vision) {
        notify({ type: "error", title: t("attach.noVision") });
        continue;
      }
      if (count >= limits.count || (isImageFile(file) && images >= limits.images)) {
        notify({ type: "error", title: t("attach.tooMany") });
        break;
      }
      try {
        const draft = await readAttachment(file);
        if (draft.previewUrl) previews.current.add(draft.previewUrl);
        added.push(draft);
        count++;
        if (draft.kind === "image") images++;
      } catch (err) {
        const reason = err instanceof AttachmentReadError ? err.reason : "unsupported";
        notify({ type: "error", title: t(`attach.${reason}`, file.name) });
      }
    }
    if (added.length) setFiles((list) => [...list, ...added]);
  };

  const submit = () => {
    const content = text.trim();
    if ((!content && !files.length) || blocked) return;
    const attachments = files.map(({ kind, name, mime, data }) => ({ kind, name, mime, data }));
    // Errors are toasted by the query client already
    send.mutate(
      { id: conversationId, content, context: { serverId: selectedServer?.id }, attachments },
      {
        onSuccess: () => {
          setText("");
          files.forEach(release);
          setFiles([]);
        },
      }
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  // Screenshots pasted from the clipboard become attachments, plain text pastes as usual
  const onPaste = (event: ClipboardEvent) => {
    const pasted = [...event.clipboardData.files];
    if (!pasted.length) return;
    event.preventDefault();
    void addFiles(pasted);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void addFiles([...event.dataTransfer.files]);
  };

  return (
    <div className="shrink-0 px-3 pt-1 pb-3">
      <div
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => !event.currentTarget.contains(event.relatedTarget as Node) && setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-xl border border-input bg-field transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-3 focus-within:ring-primary/18",
          dragging && "border-primary/60 ring-3 ring-primary/18"
        )}
      >
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-2.5 pt-2.5">
            {files.map((file) =>
              file.kind === "image" ? (
                <span key={file.key} className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border" title={file.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview */}
                  <img src={file.previewUrl} alt={file.name} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(file.key)}
                    aria-label={t("attach.remove")}
                    className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-background/85 text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ) : (
                <FileChip key={file.key} name={file.name} size={new Blob([file.data]).size}>
                  <button type="button" onClick={() => removeFile(file.key)} aria-label={t("attach.remove")} className="text-muted-foreground hover:text-foreground">
                    <X className="size-3" />
                  </button>
                </FileChip>
              )
            )}
          </div>
        )}
        <textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={2}
          maxLength={8000}
          placeholder={dragging ? t("attach.drop") : waiting ? t(WAITING_HINT[waiting]) : t("placeholder")}
          aria-label={t("placeholder")}
          className="block field-sizing-content max-h-48 min-h-[52px] w-full resize-none bg-transparent px-3.5 pt-3 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <input
          ref={pickerRef}
          type="file"
          multiple
          hidden
          accept={fileAccept(vision)}
          onChange={(event) => {
            void addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        <div className="flex items-center gap-1.5 px-2 pb-2">
          <Toggle
            size="sm"
            pressed={autoApprove}
            onPressedChange={setAutoApprove}
            aria-label={t("auto")}
            title={autoApprove ? t("autoOn") : t("autoOff")}
            className={cn(CHIP_TOGGLE, autoApprove && "bg-warn/14 text-warn hover:bg-warn/20 data-pressed:bg-warn/14 data-pressed:text-warn")}
          >
            <Zap className={cn("size-3", autoApprove && "fill-current")} />
            {t("auto")}
          </Toggle>
          {capabilities?.reasoning !== false && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    title={t("reasoning.hint")}
                    className={cn(CHIP_TOGGLE, "text-muted-foreground", reasoning !== "auto" && "bg-primary/12 text-primary hover:bg-primary/18")}
                  />
                }
              >
                <Brain className="size-3" />
                {reasoning === "auto" ? t("reasoning.short") : t(`reasoning.levels.${reasoning}`)}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-auto">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t("reasoning.title")}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={reasoning} onValueChange={(value) => setReasoning(value as AssistantReasoningLevel)}>
                    {ASSISTANT_REASONING_LEVELS.map((level) => (
                      <DropdownMenuRadioItem key={level} value={level}>
                        {t(`reasoning.levels.${level}`)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {capabilities?.webSearch && (
            <Toggle
              size="sm"
              pressed={webSearch}
              onPressedChange={setWebSearch}
              aria-label={t("web.label")}
              title={webSearch ? t("web.on") : t("web.off")}
              className={cn(CHIP_TOGGLE, webSearch && "bg-success/14 text-success hover:bg-success/20 data-pressed:bg-success/14 data-pressed:text-success")}
            >
              <Globe className="size-3" />
              {t("web.label")}
            </Toggle>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            className="ml-auto rounded-lg text-muted-foreground"
            aria-label={t("attach.button")}
            title={vision ? t("attach.hint") : t("attach.hintText")}
            disabled={files.length >= ASSISTANT_ATTACHMENT_LIMITS.count}
            onClick={() => pickerRef.current?.click()}
          >
            <Paperclip />
          </Button>
          {busy && conversationId ? (
            <Button
              size="icon-sm"
              variant="secondary"
              className="rounded-lg"
              aria-label={t("stop")}
              title={t("stop")}
              onClick={() => stop.mutate(conversationId)}
            >
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button
              size="icon-sm"
              className="rounded-lg"
              aria-label={t("send")}
              title={t("send")}
              disabled={(!text.trim() && !files.length) || blocked}
              onClick={submit}
            >
              <ArrowUp />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
