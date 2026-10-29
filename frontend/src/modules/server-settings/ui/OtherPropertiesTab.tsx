"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Input } from "@/shared/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { SettingsGroup } from "@/shared/ui/settings";
import { Table, TableBody, TableCell, TableRow } from "@/shared/ui/table";
import { Plus, Search, SearchX, Settings, Trash2, Undo2 } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import type { SettingsDraft } from "../hooks/useSettingsDraft";
import { PROPERTY_TAB } from "../lib/schema";

export function OtherPropertiesTab({ draft }: { draft: SettingsDraft }) {
  const { t } = useTranslation("modules.serverSettings.other.customProperties");
  const [query, setQuery] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const keys = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = new Set([...Object.keys(draft.savedProps), ...draft.addedKeys]);
    return [...all].filter((key) => !(key in PROPERTY_TAB) && (!q || key.toLowerCase().includes(q))).sort();
  }, [draft.savedProps, draft.addedKeys, query]);

  // The top row is always there, filling it in adds a property and leaves it empty again
  const add = () => {
    const key = newKey.trim();
    if (!key) return;
    draft.setProperty(key, newValue);
    setNewKey("");
    setNewValue("");
  };
  const addOnEnter = (event: KeyboardEvent) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    add();
  };

  return (
    <SettingsGroup tone="gray" icon={Settings} title={t("title")} description={t("description")} flush>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <InputGroup className="w-60">
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
        </InputGroup>
      </div>

      <Table>
        <TableBody>
          <TableRow className="h-11 hover:bg-transparent">
            <TableCell className="w-[46%]">
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={addOnEnter}
                placeholder={t("propertyNamePlaceholder")}
                className="h-7 font-mono text-xs"
                aria-label={t("propertyNamePlaceholder")}
              />
            </TableCell>
            <TableCell>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={addOnEnter}
                placeholder={t("propertyValuePlaceholder")}
                className="h-7 font-mono text-xs"
                aria-label={t("propertyValuePlaceholder")}
              />
            </TableCell>
            <TableCell className="w-12">
              <Button variant="ghost" size="icon-sm" onClick={add} disabled={!newKey.trim()} aria-label={t("addProperty")} title={t("addProperty")}>
                <Plus />
              </Button>
            </TableCell>
          </TableRow>
          {keys.map((key) => {
            const removed = draft.removed.has(key);
            return (
              <TableRow key={key} data-removed={removed || undefined} className="h-11 data-removed:opacity-50">
                <TableCell
                  data-changed={draft.propertyChanged(key) || undefined}
                  className="w-[46%] font-mono text-xs text-muted-foreground data-changed:text-primary"
                >
                  <span className="in-data-removed:line-through">{key}</span>
                </TableCell>
                <TableCell>
                  <Input
                    value={draft.property(key)}
                    disabled={removed}
                    onChange={(e) => draft.setProperty(key, e.target.value)}
                    className="h-7 font-mono text-xs"
                    aria-label={key}
                  />
                </TableCell>
                <TableCell className="w-12">
                  {removed ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => draft.setProperty(key, draft.savedProps[key] ?? "")}
                      aria-label={t("restore")}
                      title={t("restore")}
                    >
                      <Undo2 />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="hover:text-danger"
                      onClick={() => draft.removeProperty(key)}
                      aria-label={t("remove")}
                      title={t("remove")}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {keys.length === 0 && query.trim() && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>{t("notFound")}</EmptyTitle>
            <EmptyDescription>{t("notFoundHint")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </SettingsGroup>
  );
}
