import { qk } from "@/shared/queries/query-keys";
import { useQuery } from "@tanstack/react-query";

export interface GoogleFont {
  family: string;
  category: string;
  subsets: string[];
  weights: number[];
}

// Fontsource mirrors the Google Fonts catalog and, unlike Google, needs no API key
const CATALOG_URL = "https://api.fontsource.org/v1/fonts?type=google";

/** Straight from the browser, only once the picker opens */
export function useGoogleFontsQuery(enabled: boolean) {
  return useQuery({
    queryKey: qk.googleFonts.list(),
    queryFn: async ({ signal }) => {
      const response = await fetch(CATALOG_URL, { signal });
      if (!response.ok) throw new Error(`Font catalog: ${response.status}`);
      const fonts = (await response.json()) as GoogleFont[];
      return fonts.map(({ family, category, subsets, weights }) => ({ family, category, subsets, weights }));
    },
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    meta: { silent: true },
  });
}
