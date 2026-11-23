"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { GithubMark } from "@/shared/ui/GithubMark";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { TriangleAlert, User, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { CatalogKind } from "../api/readme.queries";
import { type CatalogEntry, type CatalogMark, formatSize, repoUrl, sourceUrl } from "../lib/catalog";
import { CatalogAction } from "./CatalogAction";
import { SourceBadge } from "./CatalogBadges";
import { CatalogIcon } from "./CatalogIcon";
import { CatalogReadme } from "./CatalogReadme";

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" });

export function CatalogSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-2 max-sm:grid-cols-[minmax(0,1fr)]">
      <h4 className="label-caps">{title}</h4>
      {children}
    </section>
  );
}

/** Label and value pairs, two columns from sm up */
export function CatalogFacts({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">{children}</dl>;
}

export function CatalogFact({ label, children, wide }: { label: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "grid min-w-0 gap-0.5 sm:col-span-2" : "grid min-w-0 gap-0.5"}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  );
}

const linkClass = "text-primary hover:underline";

type DialogTab = "overview" | "readme";

interface CatalogItemDialogProps<T extends CatalogEntry> {
  kind: CatalogKind;
  item: T | null;
  icon: LucideIcon;
  marks: CatalogMark[];
  /** Kind-specific sections, permissions or install steps */
  details?: ReactNode;
  installing: boolean;
  onInstall?: () => void;
  onClose: () => void;
}

/** Everything the index knows about a package, so there is no need to open GitHub */
export function CatalogItemDialog<T extends CatalogEntry>({ kind, item, icon, marks, details, installing, onInstall, onClose }: CatalogItemDialogProps<T>) {
  const { t } = useTranslation("modules.catalog");
  // Keeps the content while the close animation plays
  const [last, setLast] = useState(item);
  const [tab, setTab] = useState<DialogTab>("overview");
  if (item && item !== last) {
    if (item.id !== last?.id) setTab("overview");
    setLast(item);
  }
  const shown = item ?? last;
  const hasReadme = !!shown?.readme && Object.keys(shown.readme.files).length > 0;
  const warnings = marks.filter((mark) => mark.warning);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px]">
        {shown && (
          <>
            <DialogHeader className="flex-row items-center gap-3">
              <CatalogIcon item={shown} fallback={icon} size="lg" />
              <div className="grid min-w-0 flex-1 gap-1">
                <DialogTitle className="truncate">{shown.name}</DialogTitle>
                <DialogDescription className="flex min-w-0 items-center gap-1.5">
                  <User className="size-3 shrink-0" />
                  {shown.authorUrl ? (
                    <a href={shown.authorUrl} target="_blank" rel="noreferrer" className="truncate">
                      {shown.author}
                    </a>
                  ) : (
                    <span className="truncate">{shown.author}</span>
                  )}
                </DialogDescription>
              </div>
              <SourceBadge source={shown.source} />
            </DialogHeader>

            <DialogBody className="grid gap-5">
              {hasReadme && (
                <Tabs value={tab} onValueChange={(value) => setTab(value as DialogTab)}>
                  <TabsList>
                    <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
                    <TabsTrigger value="readme">{t("tabs.readme")}</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
              {hasReadme && tab === "readme" ? (
                <CatalogReadme kind={kind} id={shown.id} active={!!item} />
              ) : (
                <>
                <p className="leading-relaxed whitespace-pre-line text-muted-foreground">{shown.description}</p>

                {warnings.length > 0 && (
                  <ul className="tone-amber grid gap-2 rounded-lg border border-tone/25 bg-tone/9 px-3.5 py-3">
                    {warnings.map((mark) => (
                      <li key={mark.key} className="grid grid-cols-[16px_minmax(0,1fr)] gap-2">
                        <TriangleAlert className="mt-0.5 size-3.5 text-tone" />
                        <span>
                          <b className="font-medium">{mark.label}</b>
                          {mark.title && <span className="block text-[12.5px] text-muted-foreground">{mark.title}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {details}

                <CatalogSection title={t("details.info")}>
                  <CatalogFacts>
                    <CatalogFact label={t("details.version")}>
                      <span className="font-mono">{shown.version}</span>
                      {shown.installedVersion && <span className="text-muted-foreground"> {t("fromVersion", shown.installedVersion)}</span>}
                    </CatalogFact>
                    <CatalogFact label={t("details.kubek")}>
                      <span className={shown.compatible ? "font-mono" : "font-mono text-warn"}>{shown.engines.kubek || t("details.any")}</span>
                    </CatalogFact>
                    <CatalogFact label={t("details.updated")}>
                      {shown.updatedAt ? (
                        <span title={formatRelative(new Date(shown.updatedAt).getTime(), t("justNow"))}>{dateFormat.format(new Date(shown.updatedAt))}</span>
                      ) : (
                        "-"
                      )}
                    </CatalogFact>
                    <CatalogFact label={t("license")}>{shown.license ?? t("details.noLicense")}</CatalogFact>
                    <CatalogFact label={t("details.size")}>{formatSize(shown.download.size)}</CatalogFact>
                    <CatalogFact label={t("details.id")}>
                      <span className="font-mono" title={shown.id}>
                        {shown.id}
                      </span>
                    </CatalogFact>
                    <CatalogFact label={t("details.repo")}>
                      <a href={repoUrl(shown)} target="_blank" rel="noreferrer" className={linkClass}>
                        {shown.repo}
                      </a>
                    </CatalogFact>
                    {shown.commit && (
                      <CatalogFact label={t("details.commit")}>
                        <a
                          href={`https://github.com/${shown.repo}/tree/${shown.commit}`}
                          target="_blank"
                          rel="noreferrer"
                          className={`font-mono ${linkClass}`}
                          title={t("commitHint")}
                        >
                          {shown.commit.slice(0, 12)}
                        </a>
                      </CatalogFact>
                    )}
                    <CatalogFact label="SHA-256" wide>
                      <span className="font-mono text-[12px] text-muted-foreground" title={shown.download.sha256}>
                        {shown.download.sha256}
                      </span>
                    </CatalogFact>
                  </CatalogFacts>
                </CatalogSection>
                </>
              )}
            </DialogBody>

            <DialogFooter className="sm:justify-between">
              <Button variant="outline" nativeButton={false} render={<a href={sourceUrl(shown)} target="_blank" rel="noreferrer" />}>
                <GithubMark className="size-4" />
                {t("details.github")}
              </Button>
              <div className="flex sm:min-w-44">
                <CatalogAction item={shown} installing={installing} onInstall={onInstall} />
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
