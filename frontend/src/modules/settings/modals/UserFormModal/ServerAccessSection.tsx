import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Switch } from "@/shared/ui/switch";
import { ChevronsUpDown, Search, Server, X } from "lucide-react";
import { useMemo, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { UserFormDataUnion } from "./schema";

interface ServerAccessSectionProps {
  form: UseFormReturn<UserFormDataUnion>;
  isLoading: boolean;
}

export function ServerAccessSection({
  form,
  isLoading,
}: ServerAccessSectionProps) {
  const { t } = useTranslation("modules.createUserModal");
  const { servers } = useServerStore();

  const restrictEnabled = form.watch("serversRestrict.enabled");
  const watchedAllowed = form.watch("serversRestrict.allowed");
  const allowed = useMemo(() => watchedAllowed || [], [watchedAllowed]);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allowedSet = useMemo(() => new Set(allowed), [allowed]);
  const serverById = useMemo(
    () => new Map(servers.map((s) => [s.id, s])),
    [servers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return servers;
    return servers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [servers, search]);

  const setAllowed = (next: string[]) =>
    form.setValue("serversRestrict.allowed", next, {
      shouldValidate: true,
      shouldDirty: true,
    });

  const toggle = (id: string) =>
    setAllowed(
      allowedSet.has(id) ? allowed.filter((x) => x !== id) : [...allowed, id]
    );

  const removeServer = (id: string) =>
    setAllowed(allowed.filter((x) => x !== id));

  const selectAllFiltered = () => {
    const merged = new Set(allowed);
    filtered.forEach((s) => merged.add(s.id));
    setAllowed([...merged]);
  };

  const clearAll = () => setAllowed([]);

  const noServers = servers.length === 0;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-orange-500/10 p-2">
            <Server className="h-4 w-4 text-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-start max-sm:gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold">
                  {t("modal.sections.serverAccess.title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("modal.sections.serverAccess.description")}
                </p>
              </div>
              <FormField
                control={form.control}
                name="serversRestrict.enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 max-sm:w-full max-sm:justify-between">
                    <FormLabel className="text-sm">
                      {t("modal.sections.serverAccess.restrictAccess")}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {restrictEnabled && (
          <div className="space-y-3">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                disabled={isLoading || noServers}
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-between gap-2 font-normal"
                  />
                }
              >
                <span
                  className={cn(
                    "truncate",
                    allowed.length === 0 && "text-muted-foreground"
                  )}
                >
                  {noServers
                    ? t("modal.sections.serverAccess.picker.noServers")
                    : allowed.length === 0
                      ? t("modal.sections.serverAccess.picker.placeholder")
                      : t(
                          "modal.sections.serverAccess.picker.selectedCount",
                          allowed.length
                        )}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-(--anchor-width) min-w-[15rem] gap-0 overflow-hidden rounded-xl p-0"
              >
                <div className="flex items-center gap-2 border-b border-border/60 px-3">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("modal.sections.serverAccess.picker.search")}
                    className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
                  />
                </div>

                <ScrollArea className="max-h-64">
                  <div className="p-1">
                    {filtered.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        {t("modal.sections.serverAccess.picker.notFound")}
                      </p>
                    ) : (
                      filtered.map((srv) => {
                        const checked = allowedSet.has(srv.id);
                        return (
                          <button
                            type="button"
                            key={srv.id}
                            onClick={() => toggle(srv.id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                              checked ? "bg-primary/5" : "hover:bg-muted"
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              className="pointer-events-none"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm">
                              {srv.name}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                <div className="flex items-center justify-between border-t border-border/60 px-2 py-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={selectAllFiltered}
                    disabled={filtered.length === 0}
                  >
                    {t("modal.sections.serverAccess.picker.selectAll")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={clearAll}
                    disabled={allowed.length === 0}
                  >
                    {t("modal.sections.serverAccess.picker.clear")}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {allowed.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allowed.map((id) => {
                  const srv = serverById.get(id);
                  // A saved id with no matching server - the server was likely deleted
                  const isOrphan = !srv;
                  return (
                    <Badge
                      key={id}
                      variant={isOrphan ? "outline" : "secondary"}
                      className={cn(
                        "gap-1 py-1 pr-1 pl-2.5",
                        isOrphan && "text-muted-foreground"
                      )}
                    >
                      <span className="max-w-[12rem] truncate">
                        {srv?.name ?? id}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeServer(id)}
                        className="h-4 w-4 hover:bg-transparent"
                        aria-label={t(
                          "modal.sections.serverAccess.picker.remove"
                        )}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 py-4 text-center">
                <Server className="mx-auto mb-2 h-7 w-7 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {t("modal.sections.serverAccess.emptyState.title")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("modal.sections.serverAccess.emptyState.description")}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
