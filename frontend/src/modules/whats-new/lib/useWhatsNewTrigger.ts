"use client";
import {
  usePreferencesQuery,
  useUpdatePreferencesMutation,
} from "@/shared/queries/preferences.queries";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useModalStore } from "@/shared/stores/modal-store";
import { useEffect, useRef } from "react";
import { findRelease } from "../data/releases";
import { WHATS_NEW_MODAL_ID } from "../ui/WhatsNewModal";
import { compareVersions } from "./version";

// Reads per-user preferences and opens the what's-new modal once after an update
export function useWhatsNewTrigger() {
  const { data } = usePreferencesQuery({ staleTime: Infinity });
  const { mutate: updatePreferences } = useUpdatePreferencesMutation({ silent: true });
  const openModal = useModalStore((s) => s.openModal);
  // Distinguishes a returning user from a fresh install when no version is recorded
  const oobeCompleted = useAuthStore((s) => s.user?.oobeCompleted ?? false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!data || firedRef.current) return;
    firedRef.current = true;

    const panelVersion = data.panelVersion;
    const seen = data.lastSeenWhatsNewVersion;
    if (!panelVersion) return;

    const release = findRelease(panelVersion);
    const markSeen = () => {
      updatePreferences({ lastSeenWhatsNewVersion: panelVersion });
    };
    const showThenMark = () => {
      void openModal(WHATS_NEW_MODAL_ID, { version: panelVersion }).then(
        markSeen
      );
    };

    // No version recorded yet: either a fresh install/onboarding (stay silent) or
    // an existing user upgrading from a build that predates this field. A completed
    // OOBE marks the latter, so those users still get the notes
    if (!seen) {
      if (oobeCompleted && release) showThenMark();
      else markSeen();
      return;
    }

    // Normal upgrade path: show once when moving up to a version with curated notes
    if (compareVersions(panelVersion, seen) > 0 && release) {
      showThenMark();
    } else if (panelVersion !== seen) {
      // Updated to a version without curated notes, or moved sideways
      markSeen();
    }
  }, [data, openModal, oobeCompleted, updatePreferences]);
}
