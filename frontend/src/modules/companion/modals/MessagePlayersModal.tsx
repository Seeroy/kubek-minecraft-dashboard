"use client";

import { useNotifications } from "@/modules/notifications";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import type { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";
import { Textarea } from "@/shared/ui/textarea";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { Send } from "lucide-react";
import { useState } from "react";
import { useBroadcastMutation, useTitleMutation } from "../api/companion.queries";

export interface MessagePlayersProps {
  serverId: string;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "companion/message": { props: MessagePlayersProps; result: void };
  }
}

type Kind = "chat" | "title";

function MessagePlayersModal({ isOpen, onClose, serverId }: ModalProps & MessagePlayersProps) {
  const { t } = useTranslation("modules.companion.message");
  const { notify } = useNotifications();
  const broadcast = useBroadcastMutation(serverId);
  const title = useTitleMutation(serverId);
  const [kind, setKind] = useState<Kind>("chat");
  const [text, setText] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [seconds, setSeconds] = useState(4);

  const pending = broadcast.isPending || title.isPending;
  const ready = text.trim().length > 0;

  const send = async () => {
    try {
      if (kind === "chat") await broadcast.mutateAsync(text.trim());
      else await title.mutateAsync({ title: text.trim(), subtitle: subtitle.trim() || undefined, seconds });
      notify({ type: "success", title: t("sent") });
      onClose();
    } catch (error) {
      notify({ type: "error", title: t("failed"), message: getApiErrorMessage(error) });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <ToggleGroup variant="segmented" value={[kind]} onValueChange={(next) => next[0] && setKind(next[0] as Kind)} aria-label={t("kind")}>
            <Toggle variant="segmented" value="chat">
              {t("chat")}
            </Toggle>
            <Toggle variant="segmented" value="title">
              {t("titleKind")}
            </Toggle>
          </ToggleGroup>
          <Field>
            <FieldLabel htmlFor="companion-message">{kind === "chat" ? t("text") : t("titleText")}</FieldLabel>
            {kind === "chat" ? (
              <Textarea id="companion-message" rows={3} maxLength={512} autoFocus value={text} onChange={(e) => setText(e.target.value)} />
            ) : (
              <Input id="companion-message" maxLength={128} autoFocus value={text} onChange={(e) => setText(e.target.value)} />
            )}
            <FieldDescription>{t("colors")}</FieldDescription>
          </Field>
          {kind === "title" && (
            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
              <Field>
                <FieldLabel htmlFor="companion-subtitle">{t("subtitle")}</FieldLabel>
                <Input id="companion-subtitle" maxLength={128} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="companion-seconds">{t("seconds")}</FieldLabel>
                <Input
                  id="companion-seconds"
                  type="number"
                  min={1}
                  max={30}
                  value={seconds}
                  onChange={(e) => setSeconds(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
                />
              </Field>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onClose()}>
            {t("cancel")}
          </Button>
          <Button disabled={!ready || pending} onClick={() => void send()}>
            {pending ? <Spinner /> : <Send />}
            {t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const MESSAGE_PLAYERS_MODAL_ID = "companion/message";

export function MessagePlayersModalRegistration() {
  useThisModal({ id: MESSAGE_PLAYERS_MODAL_ID, component: MessagePlayersModal, module: "companion" });
  return null;
}
