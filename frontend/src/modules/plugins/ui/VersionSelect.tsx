import type { Translator } from "@/locales/types";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ModrinthVersion } from "@shared/types/plugins";
import { FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 25;

// Compact game-version label converter
function formatGameVersions(gameVersions: string[]): string {
  if (gameVersions.length === 0) return "";
  if (gameVersions.length === 1) return gameVersions[0];
  return `${gameVersions[0]}–${gameVersions[gameVersions.length - 1]}`;
}

interface VersionSelectProps {
  versions: ModrinthVersion[];
  selectedVersionId?: string;
  onSelectVersion: (id: string | undefined) => void;
  versionsLoading: boolean;
  isSubmitting: boolean;
  onLoadVersions: () => void;
  t: Translator;
}

export function VersionSelect({
  versions,
  selectedVersionId,
  onSelectVersion,
  versionsLoading,
  isSubmitting,
  onLoadVersions,
  t,
}: VersionSelectProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset paging whenever the underlying list changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [versions]);

  // Reveal the next page once the sentinel scrolls into view inside the popup
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((count) => count + PAGE_SIZE);
      }
    });
    observerRef.current.observe(node);
  }, []);

  const visibleVersions = versions.slice(0, visibleCount);
  const hasMore = visibleCount < versions.length;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <FileText className="h-4 w-4" />
        {t("sections.versionSelection")}
      </Label>
      <Select
        value={selectedVersionId}
        onValueChange={(value) => value != null && onSelectVersion(value)}
        disabled={isSubmitting}
        onOpenChange={(open) => {
          if (open && versions.length === 0) {
            onLoadVersions();
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("controls.chooseVersion")}>
            {(value) => {
              const selected = versions.find((version) => version.id === value);
              return selected?.version_number ?? t("controls.chooseVersion");
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {versionsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm">{t("statuses.loadingVersions")}</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {t("statuses.noVersions")}
            </div>
          ) : (
            <>
              {visibleVersions.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  <div className="flex flex-col items-start justify-start gap-1">
                    <span className="font-medium">
                      {version.version_number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(version.date_published).toLocaleDateString()} ·
                      {t("sections.versionDownloads", version.downloads)}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {version.loaders.map((loader) => (
                        <Badge
                          key={loader}
                          variant="secondary"
                          className="px-1.5 py-0 text-[10px] capitalize"
                        >
                          {loader}
                        </Badge>
                      ))}
                      {version.game_versions.length > 0 && (
                        <span className="text-[10px] text-muted-foreground/80">
                          {formatGameVersions(version.game_versions)}
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="flex items-center justify-center py-3"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
