import { api } from "@/api"
import { useQuery } from "@tanstack/react-query"
import { qk } from "@/shared/queries/query-keys"

/** GitHub repository backing the changelog */
export const GITHUB_REPO = "Seeroy/kubek-minecraft-dashboard"
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`

export interface GithubRelease {
  id: number
  tagName: string
  name: string | null
  body: string | null
  htmlUrl: string
  publishedAt: string | null
  prerelease: boolean
}

/** Current panel version reported by the backend */
export function useKubekVersionQuery() {
  return useQuery({
    queryKey: qk.about.version(),
    queryFn: () => api.kubek.getVersion(),
    staleTime: 5 * 60_000,
  })
}

/** Update availability - computed on the backend */
export function useUpdateCheckQuery(enabled = true) {
  return useQuery({
    queryKey: qk.about.updateCheck(),
    queryFn: () => api.kubek.checkForUpdates(),
    enabled,
    staleTime: 30 * 60_000,
    retry: 1,
  })
}

/** Published releases from GitHub, newest first */
export function useGithubReleasesQuery() {
  return useQuery({
    queryKey: qk.about.releases(),
    queryFn: async (): Promise<GithubRelease[]> => {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=20`,
        {
          headers: { Accept: "application/vnd.github+json" },
        }
      )
      if (!res.ok) throw new Error(`GitHub API ${res.status}`)
      const raw = (await res.json()) as Array<Record<string, unknown>>
      return raw
        .filter((r) => !r.draft)
        .map((r) => ({
          id: r.id as number,
          tagName: r.tag_name as string,
          name: (r.name as string) || null,
          body: (r.body as string) || null,
          htmlUrl: r.html_url as string,
          publishedAt: (r.published_at as string) || null,
          prerelease: Boolean(r.prerelease),
        }))
    },
    staleTime: 30 * 60_000,
    retry: 1,
  })
}
