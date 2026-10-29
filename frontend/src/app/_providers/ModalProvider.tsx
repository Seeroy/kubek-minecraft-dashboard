"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { emitToast } from "@/shared/lib/toast-bus";
import { useModalStore } from "@/shared/stores/modal-store";
import { Component, Suspense, useMemo, type ReactNode } from "react";

// A lazy modal chunk can fail to load, e.g. a tab left open across a panel update
class ModalBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function ModalProvider() {
  const { t } = useTranslation("modules.commonModals");
  const modals = useModalStore((s) => s.modals);
  const activeModals = useModalStore((s) => s.activeModals);

  // Sort by open order so the latest opened modal renders last in the DOM
  const sorted = useMemo(
    () => Array.from(activeModals.values()).sort((a, b) => a.order - b.order),
    [activeModals]
  );

  return (
    <>
      {sorted.map((active) => {
        const modalConfig = modals.get(active.id);
        if (!modalConfig) return null;

        const ModalComponent = modalConfig.component;
        const fail = () => {
          emitToast({ type: "error", title: t("loadFailed") });
          active.props.onClose();
        };
        // Keyed by open order so reopening during the exit animation starts from fresh state
        return (
          <ModalBoundary key={`${active.id}:${active.order}`} onFail={fail}>
            <Suspense fallback={null}>
              <ModalComponent {...active.props} />
            </Suspense>
          </ModalBoundary>
        );
      })}
    </>
  );
}
