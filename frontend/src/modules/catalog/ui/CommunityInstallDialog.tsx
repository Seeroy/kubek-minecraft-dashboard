"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Checkbox } from "@/shared/ui/checkbox";
import { GithubMark } from "@/shared/ui/GithubMark";
import { toneClass } from "@/shared/ui/tone";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { type CatalogEntry, formatSize, sourceUrl } from "../lib/catalog";

interface CommunityInstallDialogProps {
  item: CatalogEntry | null;
  onConfirm: (item: CatalogEntry) => void;
  onCancel: () => void;
}

/** Community packages are reviewed once per pinned commit, the user has to accept the rest */
export function CommunityInstallDialog({ item, onConfirm, onCancel }: CommunityInstallDialogProps) {
  const { t } = useTranslation("modules.catalog.community");
  const [accepted, setAccepted] = useState(false);
  // Keeps the text while the close animation plays
  const [last, setLast] = useState(item);
  if (item && item !== last) {
    setLast(item);
    setAccepted(false);
  }
  const shown = item ?? last;

  return (
    <AlertDialog open={!!item} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogMedia className={toneClass.amber}>
            <ShieldAlert />
          </AlertDialogMedia>
          <AlertDialogTitle>{shown && t(shown.installedVersion ? "titleUpdate" : "title", shown.name)}</AlertDialogTitle>
          <AlertDialogDescription>{shown && t("description", shown.author, shown.version, formatSize(shown.download.size))}</AlertDialogDescription>
        </AlertDialogHeader>

        {shown && (
          <div className="grid gap-3 text-[13px]">
            <ul className="tone-amber grid list-disc gap-1.5 rounded-lg border border-tone/25 bg-tone/9 py-3 pr-4 pl-8 text-muted-foreground marker:text-tone">
              <li>{t("notOurs")}</li>
              <li>{t("review")}</li>
              <li>{t("noSandbox")}</li>
              <li className="font-medium text-foreground">{t("risk")}</li>
            </ul>
            <a
              href={shown.commit ? `https://github.com/${shown.repo}/tree/${shown.commit}` : sourceUrl(shown)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-[12.5px] text-primary hover:underline"
            >
              <GithubMark className="size-3.5" />
              {shown.commit ? t("sourceAt", shown.repo, shown.commit.slice(0, 7)) : t("sourceRepo", shown.repo)}
            </a>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
              <Checkbox checked={accepted} onCheckedChange={(checked) => setAccepted(checked === true)} className="mt-0.5" />
              <span>{t("accept")}</span>
            </label>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={!accepted} onClick={() => item && onConfirm(item)}>
            {shown?.installedVersion ? t("confirmUpdate") : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
