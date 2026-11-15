"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { fieldBase, menuItem } from "@/shared/ui/styles";
import type { AssistantModelInfo } from "@shared/types/assistant.types";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

// Providers list hundreds of models, the search narrows them down long before this
const VISIBLE = 80;

interface ModelPickerProps {
  id?: string;
  value: string;
  /** Undefined until the list is loaded, a typed id still works then */
  models: AssistantModelInfo[] | undefined;
  placeholder: string;
  onChange: (id: string) => void;
}

// The closed picker shows the name alone, the id is for telling list entries apart
function ModelLabel({ model, withId = true }: { model: AssistantModelInfo; withId?: boolean }) {
  return (
    <span className="grid min-w-0 text-left">
      <span className={cn("truncate", !model.name && "font-mono")} title={model.id}>
        {model.name ?? model.id}
      </span>
      {withId && model.name && <span className="truncate font-mono text-[11.5px] text-muted-foreground">{model.id}</span>}
    </span>
  );
}

/** Searchable model list that also takes an id the provider did not list */
export function ModelPicker({ id, value, models, placeholder, onChange }: ModelPickerProps) {
  const { t } = useTranslation("modules.assistant.settings");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const typed = query.trim();
  const matches = useMemo(() => {
    const needle = typed.toLowerCase();
    if (!needle) return models ?? [];
    return (models ?? []).filter((m) => m.id.toLowerCase().includes(needle) || m.name?.toLowerCase().includes(needle));
  }, [models, typed]);
  const shown = matches.slice(0, VISIBLE);
  // A typed id that is not listed is offered as is, local servers often list nothing
  const custom = typed && !models?.some((m) => m.id === typed) ? typed : null;
  const options = [...(custom ? [{ id: custom, name: null }] : []), ...shown];
  const current = models?.find((m) => m.id === value) ?? (value ? { id: value, name: null } : null);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const move = (index: number) => {
    setActive(index);
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(Math.min(active + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(Math.max(active - 1, 0));
    } else if (event.key === "Enter" && options[active]) {
      event.preventDefault();
      pick(options[active].id);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setActive(0);
        }
      }}
    >
      <PopoverTrigger
        id={id}
        className={cn(fieldBase, "flex min-h-ctl cursor-pointer items-center gap-2 px-3 py-1 text-left")}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 flex-1">
          {current ? <ModelLabel model={current} withId={false} /> : <span className="text-muted-foreground">{placeholder}</span>}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" initialFocus={inputRef} className="w-(--anchor-width) max-w-[calc(100vw-2rem)] min-w-64 gap-0 p-0">
        <div className="relative border-b border-border p-1.5">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            ref={inputRef}
            value={query}
            placeholder={t("modelSearch")}
            aria-label={t("modelSearch")}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            className="h-8 border-transparent bg-transparent pl-8 focus-visible:border-transparent focus-visible:ring-0"
          />
        </div>
        <div ref={listRef} role="listbox" aria-label={t("model")} className="scrollbar-thin max-h-72 overflow-y-auto p-1">
          {options.map((model, index) => {
            const isCustom = custom !== null && index === 0;
            return (
              <button
                key={isCustom ? `custom:${model.id}` : model.id}
                type="button"
                role="option"
                aria-selected={model.id === value}
                data-index={index}
                data-highlighted={index === active ? "" : undefined}
                onMouseMove={() => index !== active && setActive(index)}
                onClick={() => pick(model.id)}
                className={cn(menuItem, "cursor-pointer")}
              >
                {isCustom ? (
                  <span className="min-w-0 truncate">
                    {t("modelUseTyped")} <span className="font-mono">{model.id}</span>
                  </span>
                ) : (
                  <ModelLabel model={model} />
                )}
                {model.id === value && <Check className="ml-auto size-3.5" aria-hidden />}
              </button>
            );
          })}
          {!options.length && (
            <p className="px-2 py-3 text-center text-[12.5px] text-muted-foreground">{models ? t("modelNoMatch") : t("modelNotLoaded")}</p>
          )}
          {matches.length > VISIBLE && (
            <p className="px-2 py-1.5 text-center text-[11.5px] text-muted-foreground">{t("modelMore", matches.length - VISIBLE)}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
