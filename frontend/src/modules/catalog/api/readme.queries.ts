import { api } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { qk } from "@/shared/queries";
import { useQuery } from "@tanstack/react-query";

export type CatalogKind = "extensions" | "blueprints";

/** README in the panel language, loaded only when its tab is open */
export function useCatalogReadme(kind: CatalogKind, id: string | undefined, enabled: boolean) {
  const { language } = useTranslation();
  return useQuery({
    queryKey: kind === "extensions" ? qk.extensions.catalogReadme(id ?? "", language) : qk.serverTypes.catalogReadme(id ?? "", language),
    queryFn: () =>
      kind === "extensions" ? api.extensions.catalogReadme(id!, language) : api.serverTypes.catalogReadme(id!, language),
    enabled: enabled && !!id,
    staleTime: 10 * 60_000,
    // The tab shows its own error
    meta: { silent: true },
  });
}
