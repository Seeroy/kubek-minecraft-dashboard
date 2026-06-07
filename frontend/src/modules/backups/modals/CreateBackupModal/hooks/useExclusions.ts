import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { CreateBackupFormValues } from "../validations/schema";

/**
 * Manages the glob-exclusion input and the form's globExceptions array
 */
export function useExclusions(form: UseFormReturn<CreateBackupFormValues>) {
  const [currentExclusion, setCurrentExclusion] = useState("");

  const addExclusion = () => {
    const currentExclusions = form.watch("globExceptions") || [];
    if (
      currentExclusion.trim() &&
      !currentExclusions.includes(currentExclusion.trim())
    ) {
      const newExclusions = [...currentExclusions, currentExclusion.trim()];
      form.setValue("globExceptions", newExclusions);
      setCurrentExclusion("");
    }
  };

  const removeExclusion = (exclusion: string) => {
    const currentExclusions = form.watch("globExceptions") || [];
    const newExclusions = currentExclusions.filter((e) => e !== exclusion);
    form.setValue("globExceptions", newExclusions);
  };

  const handleExclusionKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addExclusion();
    }
  };

  return {
    currentExclusion,
    setCurrentExclusion,
    addExclusion,
    removeExclusion,
    handleExclusionKeyPress,
  };
}
