import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { ModrinthSearchHit } from "@shared/types/plugins";
import {
  Calendar,
  Download,
  ExternalLink,
  Heart,
  Plug,
  User,
} from "lucide-react";
import { forwardRef } from "react";

interface CatalogCardProps {
  hit: ModrinthSearchHit;
  onInstall: () => void;
  disabled?: boolean;
}

export const CatalogCard = forwardRef<HTMLDivElement, CatalogCardProps>(
  ({ hit, onInstall, disabled }, ref) => {
    const hasIcon = !!hit.icon_url;
    const serverSideSupported = hit.server_side !== "unsupported";
    const { t } = useTranslation("modules.plugins.availableTab");
    const { t: catalogT } = useTranslation("modules.plugins.catalogCard");

    return (
      <Card
        ref={ref}
        className="group flex h-max flex-col gap-1 bg-background/20 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
      >
        <CardHeader className="space-y-3 pb-2">
          <div className="flex items-center justify-center gap-3">
            {hasIcon && (
              <div className="flex h-13 w-13 items-center justify-center rounded-lg border border-border/50 object-cover p-2">
                <img
                  src={hit.icon_url}
                  alt={hit.title}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <h3 className="line-clamp-2 text-sm leading-tight font-semibold transition-colors">
                {hit.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                {hit.description}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    <span>{(hit.downloads / 1000).toFixed(1)}k</span>
                  </div>
                }
              />
              <TooltipContent>
                {t("labels.downloads", hit.downloads)}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    <span>{hit.follows.toLocaleString()}</span>
                  </div>
                }
              />
              <TooltipContent>
                {t("labels.followers", hit.follows)}
              </TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{hit.author}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-2 py-2">
          {/* Categories */}
          <div className="flex flex-wrap gap-1">
            {hit.display_categories.slice(0, 3).map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="px-1.5 py-0 text-[10px]"
              >
                {category}
              </Badge>
            ))}
            {hit.display_categories.length > 3 && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {catalogT(
                  "badges.categoriesOverflow",
                  hit.display_categories.length - 3
                )}
              </Badge>
            )}
          </div>

          {/* Versions */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Calendar className="h-2.5 w-2.5" />
              {t("labels.versions")}
            </div>
            <div className="flex flex-wrap gap-1">
              {hit.versions.slice(0, 2).map((version) => (
                <Badge
                  key={version}
                  variant="outline"
                  className="px-1.5 py-0 font-mono text-[10px]"
                >
                  {version}
                </Badge>
              ))}
              {hit.versions.length > 2 && (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  {catalogT("badges.versionsOverflow", hit.versions.length - 2)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex gap-2 border-t border-border/20 bg-muted/5 px-5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={onInstall}
                  disabled={disabled || !serverSideSupported}
                >
                  <Plug className="mr-1.5 h-3.5 w-3.5" />
                  {t("buttons.install")}
                </Button>
              }
            />
            {disabled ? (
              <TooltipContent>{t("tooltips.disabledInstall")}</TooltipContent>
            ) : !serverSideSupported ? (
              <TooltipContent>{t("tooltips.unsupported")}</TooltipContent>
            ) : null}
          </Tooltip>

          {hit.slug && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              render={
                <a
                  href={`https://modrinth.com/plugin/${hit.slug}`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }
);
