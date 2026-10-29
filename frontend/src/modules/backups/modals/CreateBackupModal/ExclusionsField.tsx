"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Plus, X } from "lucide-react";
import { useState } from "react";

interface ExclusionsFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
}

/** Glob patterns typed one at a time and shown as removable chips */
export function ExclusionsField({ value, onChange }: ExclusionsFieldProps) {
  const { t } = useTranslation("modules.backups.createModal");
  const [draft, setDraft] = useState("");
  const pattern = draft.trim();

  const add = () => {
    if (!pattern || value.includes(pattern)) return;
    onChange([...value, pattern]);
    setDraft("");
  };

  return (
    <div className="grid gap-1.5">
      <span className="font-medium">{t("exclusions")}</span>
      <div className="flex gap-1.5">
        <Input
          className="font-mono"
          value={draft}
          placeholder={t("exclusionsPlaceholder")}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            add();
          }}
        />
        <Button type="button" variant="outline" disabled={!pattern} onClick={add}>
          <Plus />
          {t("add")}
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span key={item} className="inline-flex h-6 items-center gap-1 rounded-md bg-secondary pr-1 pl-2 font-mono text-xs">
              {item}
              <button
                type="button"
                className="grid size-[18px] cursor-pointer place-items-center rounded text-muted-foreground hover:bg-hover hover:text-foreground"
                aria-label={t("removeExclusion", item)}
                onClick={() => onChange(value.filter((other) => other !== item))}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <span className="text-xs text-muted-foreground">{t("exclusionsHint")}</span>
    </div>
  );
}
