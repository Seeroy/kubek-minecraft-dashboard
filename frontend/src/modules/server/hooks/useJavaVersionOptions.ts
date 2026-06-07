import { useLanguageContext } from "@/shared/context/language-context";
import { useJavaVersions } from "@/modules/java-manager/api/java.queries";
import { useMemo } from "react";
import type { JavaVersion } from "../modals/CreateServerModal/types";

/** LTS majors we surface a "recommended" badge for */
const RECOMMENDED_MAJORS = new Set(["8", "11", "17", "21"]);

/** Pseudo-option letting the user point at a system Java install instead of a managed one */
const SYSTEM_OPTION_ID = "system";

/** Collapse Adoptium/system version strings (e.g. "21", "21.0.1") down to their major */
function majorVersion(version: string): string {
  const match = version.match(/\d+/);
  return match ? match[0] : version;
}

/**
 * Build the Java version picker options from real backend data (Adoptium GA
 * releases + installed runtimes) plus the always-present "System Java" choice.
 * Replaces the former hardcoded JAVA_VERSIONS list. Labels/descriptions are
 * pulled from locales when available, otherwise we fall back to Java <major>
 */
export function useJavaVersionOptions(): {
  options: JavaVersion[];
  isLoading: boolean;
} {
  const { t } = useLanguageContext();
  const { data, isLoading } = useJavaVersions();

  const options = useMemo<JavaVersion[]>(() => {
    const majors = new Set<string>();
    // A major counts as "installed" when at least one entry carries a real path
    // (managed runtime under ./binaries/java or a system Java) rather than only a downloadUrl
    const installedMajors = new Set<string>();
    for (const installation of data ?? []) {
      const major = majorVersion(installation.version);
      majors.add(major);
      if (installation.path) installedMajors.add(major);
    }

    const managed = Array.from(majors)
      .sort((a, b) => Number(b) - Number(a))
      .map<JavaVersion>((version) => {
        const label = t(
          `modules.newServerModal.java.version.options.${version}.label`
        );
        const description = t(
          `modules.newServerModal.java.version.options.${version}.description`
        );
        return {
          version,
          label: label.startsWith("NOT TRANSLATED") ? `Java ${version}` : label,
          managed: true,
          recommended: RECOMMENDED_MAJORS.has(version),
          installed: installedMajors.has(version),
          description: description.startsWith("NOT TRANSLATED")
            ? undefined
            : description,
        };
      });

    const system: JavaVersion = {
      version: SYSTEM_OPTION_ID,
      label: t("modules.newServerModal.java.version.options.system.label"),
      managed: false,
      description: t(
        "modules.newServerModal.java.version.options.system.description"
      ),
    };

    return [...managed, system];
  }, [data, t]);

  return { options, isLoading };
}
