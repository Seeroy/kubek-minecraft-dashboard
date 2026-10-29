"use client";
import { usePlatformModifier } from "@/shared/hooks/usePlatformModifier";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Kbd } from "@/shared/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { Archive, Info, Upload } from "lucide-react";

/** Discoverability popover surfacing the file manager's non-obvious interactions */
const FilesHint = () => {
  const { t } = useTranslation("modules.files");
  const { mod } = usePlatformModifier();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("ui.files.tips.button")} title={t("ui.files.tips.button")}>
            <Info />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 gap-3">
        <PopoverHeader>
          <PopoverTitle>{t("ui.files.tips.title")}</PopoverTitle>
        </PopoverHeader>

        <ul className="flex flex-col gap-2.5 text-[13px]">
          <li className="flex items-center gap-3">
            <span className="flex shrink-0 items-center gap-1">
              <Kbd>{mod}</Kbd>
              <span className="text-xs text-muted-foreground">+</span>
              <Kbd>{t("ui.files.tips.click")}</Kbd>
            </span>
            <span className="text-muted-foreground">
              {t("ui.files.tips.multiSelect")}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex shrink-0 items-center gap-1">
              <Kbd>Shift</Kbd>
              <span className="text-xs text-muted-foreground">+</span>
              <Kbd>{t("ui.files.tips.click")}</Kbd>
            </span>
            <span className="text-muted-foreground">
              {t("ui.files.tips.rangeSelect")}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <Archive className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t("ui.files.tips.archive")}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <Upload className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t("ui.files.tips.dragUpload")}
            </span>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
};

export default FilesHint;
