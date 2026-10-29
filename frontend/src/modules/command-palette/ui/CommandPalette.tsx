"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Kbd } from "@/shared/ui/kbd";
import { menuLabel } from "@/shared/ui/styles";
import { Search } from "lucide-react";
import { Fragment, useMemo, useState, type KeyboardEvent } from "react";
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

  const updateQuery = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
  };

  // Reset whenever the palette closes so it reopens clean
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) updateQuery("");
  };

  const runAction = (action: CommandAction | undefined) => {
    if (!action) return;
    onOpenChange(false);
    void action.perform();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[14vh] w-[min(560px,calc(100%-2rem))] max-w-none translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>

        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            role="combobox"
            aria-expanded
            aria-controls="command-palette-results"
            className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div id="command-palette-results" role="listbox" className="max-h-[340px] scrollbar-thin overflow-y-auto p-1">
          {results.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-muted-foreground">{t("empty")}</div>
          ) : (
            results.map((action, index) => {
              const showHeader = !isSearching && (index === 0 || results[index - 1].group !== action.group);
              return (
                <Fragment key={action.id}>
                  {showHeader && <div className={menuLabel}>{t(`groups.${action.group}`)}</div>}
                  <CommandItem
                    action={action}
                    active={index === activeIndex}
                    onSelect={() => runAction(action)}
                    onHover={() => setActiveIndex(index)}
                  />
                </Fragment>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <Kbd>↑↓</Kbd> {t("footer.navigate")}
          <Kbd>↵</Kbd> {t("footer.open")}
          <Kbd>esc</Kbd> {t("footer.close")}
        </div>
      </DialogContent>
    </Dialog>
  );
}
