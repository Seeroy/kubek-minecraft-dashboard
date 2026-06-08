import { useEffect, useRef, useState } from "react";
import { SaveStatus } from "../ui/SaveStatusIndicator";

/**
 * Tracks the save indicator state for the General tab settings
 */
export const useSaveStatus = () => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount - must be called before any conditional returns
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  // Auto-reset status after showing success/error - must be called before any conditional returns
  useEffect(() => {
    if (saveStatus === "success" || saveStatus === "error") {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      statusTimeoutRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    }
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [saveStatus]);

  return { saveStatus, setSaveStatus };
};
