import { useValidateJavaPathMutation } from "@/modules/java-manager/api/java.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useState } from "react";
import type { JavaVersion } from "../modals/CreateServerModal/types";

export const JAVA_MANUAL_OPTION = "__manual";

interface UseJavaPathChoiceOptions {
  /** Current JAVA_PATH override, empty when a managed version is used */
  path: string | undefined;
  onPathChange?: (path: string) => void;
  onChange: (major: number) => void;
  /** Registered custom installations, empty when paths do not apply */
  custom: JavaVersion[];
  isLoading: boolean;
}

/** A typed path is validated before it applies */
export function useJavaPathChoice({ path, onPathChange, onChange, custom, isLoading }: UseJavaPathChoiceOptions) {
  const { t } = useTranslation("modules.newServerModal.java.version");
  const validate = useValidateJavaPathMutation();
  // null follows the saved path, true or false is an explicit user choice
  const [choice, setChoice] = useState<boolean | null>(null);
  const [typedPath, setTypedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const registered = path ? custom.find((o) => o.path === path) : undefined;
  // A saved path outside the registry opens the manual editor prefilled
  const unregistered = !isLoading && !!path && !registered;
  const manual = choice ?? unregistered;
  const typed = typedPath ?? (unregistered ? (path ?? "") : "");

  const editPath = (next: string) => {
    setTypedPath(next);
    setError(null);
  };

  const select = (next: string) => {
    setError(null);
    if (next === JAVA_MANUAL_OPTION) return setChoice(true);
    setChoice(false);
    const option = custom.find((o) => o.version === next);
    if (option?.path) return onPathChange?.(option.path);
    if (path) onPathChange?.("");
    onChange(Number(next));
  };

  const apply = async () => {
    const candidate = typed.trim();
    if (!candidate) return;
    setError(null);
    try {
      const result = await validate.mutateAsync(candidate);
      if (result.valid) onPathChange?.(candidate);
      else setError(result.error || t("manual.invalid"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("manual.invalid"));
    }
  };

  return { manual, registered, typed, error, validating: validate.isPending, editPath, select, apply };
}
