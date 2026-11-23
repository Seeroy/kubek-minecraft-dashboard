/** Repos KubekPanel/blueprints and KubekPanel/extensions, each publishes an index.json */
export type CatalogKind = "blueprints" | "extensions";

/** official lives in the catalog repo, community is built from a pinned commit of the author's repo */
export type CatalogSource = "official" | "community";

export interface CatalogDownload {
  url: string;
  sha256: string;
  /** bytes */
  size: number;
}

/** Fields both index.json files share */
export interface CatalogItemBase {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  authorUrl: string | null;
  engines: { kubek: string };
  /** PNG on the catalog's Pages */
  icon: string | null;
  /** Emoji when the manifest has no png icon */
  iconText: string | null;
  source: CatalogSource;
  /** owner/name on GitHub */
  repo: string;
  /** Commit the package is built from, for community it is the reviewed one */
  commit?: string | null;
  homepage: string | null;
  license: string | null;
  download: CatalogDownload;
  /** ISO date of that commit */
  updatedAt: string | null;
  /** Missing in indexes built before READMEs were published */
  readme?: CatalogReadme | null;
}

export interface CatalogReadme {
  /** Language to url, "default" is README.md */
  files: Record<string, string>;
  /** GitHub folder the README links are relative to */
  base: string | null;
}

export interface CatalogReadmeResponse {
  markdown: string;
  /** What was picked, "default" when there is no README for the asked language */
  lang: string;
  base: string | null;
}

export interface CatalogBlueprintIndexItem extends CatalogItemBase {
  shortName: string | null;
  game: string;
  gameName: string | null;
  tags: string[];
  platforms: string[] | null;
  runtime: "native" | "docker";
  /** Step types, the panel warns about the ones that run programs on the host */
  installSteps: string[];
}

export interface CatalogExtensionIndexItem extends CatalogItemBase {
  keywords: string[];
  capabilities: string[];
  hasBackend: boolean;
  hasFrontend: boolean;
}

export interface CatalogBlocked {
  id: string;
  reason: string;
}

export interface CatalogIndex<T extends CatalogItemBase = CatalogItemBase> {
  schemaVersion: 1;
  kind: string;
  generatedAt: string;
  items: T[];
  blocked: CatalogBlocked[];
}

/** What the panel adds to every item */
export interface CatalogItemState {
  /** engines.kubek matches this panel */
  compatible: boolean;
  /** Version installed here, null when it is not */
  installedVersion: string | null;
  updateAvailable: boolean;
  /** Same id as a type that ships with the panel, it can't be replaced */
  builtIn: boolean;
}

export type CatalogBlueprint = CatalogBlueprintIndexItem & CatalogItemState;
export type CatalogExtension = CatalogExtensionIndexItem & CatalogItemState;

export interface CatalogResponse<T> {
  items: T[];
  blocked: CatalogBlocked[];
  generatedAt: string;
  /** ms epoch of the last successful download of the index */
  fetchedAt: number;
  /** GitHub didn't answer, this is the last copy the panel has */
  stale: boolean;
}
