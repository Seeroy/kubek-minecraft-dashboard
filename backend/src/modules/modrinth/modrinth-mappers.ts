import type {
  ModrinthApiFile,
  ModrinthProject,
  ModrinthProjectSummary,
  ModrinthVersion,
  ModrinthVersionSummary,
} from "@shared/types/plugins";

export function projectToSummary(
  project: ModrinthProject,
): ModrinthProjectSummary {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    description: project.description,
    projectType: project.project_type,
    iconUrl: project.icon_url,
    downloads: project.downloads,
    serverSide: project.server_side,
    clientSide: project.client_side,
    categories: project.categories,
    displayCategories: project.additional_categories ?? project.categories,
    color: project.color,
    latestVersionIds: project.versions ?? [],
  };
}

export function versionToSummary(
  version: ModrinthVersion,
): ModrinthVersionSummary {
  return {
    id: version.id,
    name: version.name,
    versionNumber: version.version_number,
    changelog: version.changelog,
    publishedAt: version.date_published,
    loaders: version.loaders,
    gameVersions: version.game_versions,
    downloads: version.downloads,
    files: (version.files ?? []).map((file) => ({
      filename: file.filename,
      primary: file.primary,
      url: file.url,
      hashes: file.hashes,
      fileType: file.file_type ?? undefined,
      size: file.size,
    })),
    dependencies: (version.dependencies ?? []).map((dependency) => ({
      projectId: dependency.project_id ?? undefined,
      versionId: dependency.version_id ?? undefined,
      dependencyType: dependency.dependency_type,
      fileName: dependency.file_name ?? undefined,
    })),
  };
}

/** Whether a version runs on one of the given loaders and the game version */
export function isVersionCompatible(
  version: ModrinthVersion,
  loaders: string[],
  gameVersion?: string,
): boolean {
  const loaderMatch = version.loaders?.some((loader) =>
    loaders.includes(loader.toLowerCase()),
  );
  if (!loaderMatch) return false;
  return !gameVersion || !!version.game_versions?.includes(gameVersion);
}

/** Newest compatible version by publish date */
export function pickLatestCompatible(
  versions: ModrinthVersion[],
  loaders: string[],
  gameVersion?: string,
): ModrinthVersion | undefined {
  return versions
    .filter((version) => isVersionCompatible(version, loaders, gameVersion))
    .reduce<ModrinthVersion | undefined>((latest, version) => {
      if (!latest) return version;
      return Date.parse(version.date_published) >
        Date.parse(latest.date_published)
        ? version
        : latest;
    }, undefined);
}

export function pickPrimaryFile(
  version: ModrinthVersion,
): ModrinthApiFile | undefined {
  if (!version.files?.length) return undefined;
  return version.files.find((file) => file.primary) ?? version.files[0];
}

/** Required dependencies with a known project, as declared by the API */
export function requiredDependencies(
  version: ModrinthVersion,
): { projectId: string; versionId?: string }[] {
  return (version.dependencies ?? [])
    .filter((dep) => dep.dependency_type === "required" && !!dep.project_id)
    .map((dep) => ({
      projectId: dep.project_id!,
      versionId: dep.version_id ?? undefined,
    }));
}
