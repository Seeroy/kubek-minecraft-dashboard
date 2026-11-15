"use client";

import type { ContentKind } from "@/api";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import type { ModrinthSearchHit } from "@shared/types/plugins";
import { Download, User, X } from "lucide-react";
import { useState } from "react";
import { getContentKind } from "../content-kind";
import { primaryCategory } from "../lib/installed";
import { ProjectIcon } from "../ui/ProjectIcon";

export interface BulkInstallProps {
  kind: ContentKind;
  hits: ModrinthSearchHit[];
  onConfirm: (projectIds: string[]) => void;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "plugins/bulk-install": { props: BulkInstallProps; result: void };
  }
}

type BulkInstallModalProps = ModalProps & BulkInstallProps;

function BulkInstallModalComponent({ isOpen, onClose, kind, hits, onConfirm }: BulkInstallModalProps) {
  const { t } = useTranslation("modules.content.bulk");
  const { t: tk } = useTranslation(getContentKind(kind).i18nNs);
  const [items, setItems] = useState(hits);

  const confirm = () => {
    onConfirm(items.map((hit) => hit.project_id));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <ul className="scrollbar-thin max-h-80 overflow-y-auto rounded-lg border border-border">
            {items.map((hit) => (
              <li key={hit.project_id} className="flex items-center gap-3 px-3 py-2 not-first:border-t not-first:border-border">
                <ProjectIcon title={hit.title} iconUrl={hit.icon_url} category={primaryCategory(hit.display_categories)} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate font-semibold">{hit.title}</b>
                  <span className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground">
                    <User className="size-3 shrink-0" />
                    <span className="truncate">{hit.author}</span>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title={t("remove")}
                  aria-label={t("remove")}
                  onClick={() => setItems((list) => list.filter((item) => item.project_id !== hit.project_id))}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={confirm} disabled={items.length === 0}>
            <Download />
            {t("install", tk("count", items.length))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const BULK_INSTALL_MODAL_ID = "plugins/bulk-install";

export function BulkInstallModalRegistration() {
  useThisModal({
    id: BULK_INSTALL_MODAL_ID,
    component: BulkInstallModalComponent,
    module: "plugins",
  });

  return null;
}
