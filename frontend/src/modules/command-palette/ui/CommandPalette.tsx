"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Search } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCommandActions } from "../hooks/useCommandActions";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { fuzzyScore } from "../lib/fuzzy";
import type { CommandAction, CommandGroup } from "../types/command.types";
import CommandItem from "./CommandItem";

const GROUP_ORDER: CommandGroup[] = ["navigation", "servers", "actions"];

export default function CommandPalette() {
  const open = useCommandPalette((s) => s.open);
  const setOpen = useCommandPalette((s) => s.setOpen);
  const { t } = useTranslation("modules.commandPalette");
  const actions = useCommandActions();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Filtered + ordered list that drives both rendering and keyboard navigation
  const results = useMemo<CommandAction[]>(() => {
    const q = query.trim();
    if (!q) {
      return [...actions].sort(
        (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
      );
    }
    return actions
      .map((action) => ({
        action,
        score: Math.max(
          fuzzyScore(action.label, q),
          action.keywords ? fuzzyScore(action.keywords, q) : -1
        ),
      }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.action);
  }, [actions, query]);

  const isSearching = query.trim().length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Reset query whenever the palette closes so it reopens clean
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const runAction = useCallback(
    (action: CommandAction | undefined) => {
      if (!action) return;
      setOpen(false);
      void action.perform();
    },
    [setOpen]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAction(results[activeIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[12vh] w-[calc(100%-2rem)] max-w-lg translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>

        <div className="flex items-center gap-2 border-b border-border/60 px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t("empty")}
            </div>
          ) : (
            results.map((action, index) => {
              const showHeader =
                !isSearching &&
                (index === 0 || results[index - 1].group !== action.group);
              return (
                <React.Fragment key={action.id}>
                  {showHeader && (
                    <div
                      className={cn(
                        "px-3 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase",
                        index !== 0 && "mt-1"
                      )}
                    >
                      {t(`groups.${action.group}`)}
                    </div>
                  )}
                  <CommandItem
                    action={action}
                    active={index === activeIndex}
                    onSelect={() => runAction(action)}
                    onHover={() => setActiveIndex(index)}
                  />
                </React.Fragment>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
