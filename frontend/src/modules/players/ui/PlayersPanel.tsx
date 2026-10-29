"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Panel, PanelHead, PanelMeta } from "@/shared/ui/panel";
import { Search, SearchX, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PlayersPanelProps {
  /** Rows before filtering, decides between the empty and the no matches state */
  total: number;
  shown: number;
  query?: string;
  onQuery?: (query: string) => void;
  /** Left side of the head, defaults to the row count */
  head?: ReactNode;
  form?: ReactNode;
  empty: { icon: LucideIcon; title: string; hint?: string };
  children: ReactNode;
}

export function PlayersPanel({ total, shown, query, onQuery, head, form, empty, children }: PlayersPanelProps) {
  const { t } = useTranslation("modules.players");
  const EmptyIcon = empty.icon;

  return (
    <Panel className="overflow-hidden">
      <PanelHead className="flex-wrap gap-2 py-2">
        {head ?? <PanelMeta>{t("count", total)}</PanelMeta>}
        {onQuery && total > 0 && (
          <InputGroup className="w-full sm:ml-auto sm:max-w-72">
            <InputGroupAddon>
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput value={query} onChange={(event) => onQuery(event.target.value)} placeholder={t("search")} aria-label={t("search")} />
          </InputGroup>
        )}
      </PanelHead>
      {form}
      {total === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <EmptyIcon />
            </EmptyMedia>
            <EmptyTitle>{empty.title}</EmptyTitle>
            {empty.hint && <EmptyDescription>{empty.hint}</EmptyDescription>}
          </EmptyHeader>
        </Empty>
      ) : shown === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>{t("noMatches")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="divide-y divide-border">{children}</div>
      )}
    </Panel>
  );
}
