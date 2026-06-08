import { PropsOf, ResultOf } from "@/shared/types/modal-registry";
import { ModalConfig, ModalProps } from "@/shared/types/modal.types";
import { create } from "zustand";
import { installModalDevtools } from "./modal-store.dev";

interface ActiveModal {
  id: string;
  order: number;
  props: ModalProps<any> & { id: string };
  resolve: (result: any) => void;
}

interface ModalState {
  modals: Map<string, ModalConfig>;
  activeModals: Map<string, ActiveModal>;
  nextOrder: number;

  /** Register a modal's config so it can be opened by id. */
  registerModal: (config: ModalConfig) => void;
  /** Remove a modal's config; if it's currently open, resolves it as cancelled. */
  unregisterModal: (id: string) => void;

  /**
   * Open a modal and await its result. The returned promise resolves with the
   * value passed to closeModal/onClose, or undefined when cancelled
   */
  openModal: <K extends string>(
    id: K,
    props?: Omit<PropsOf<K>, "isOpen" | "onClose">
  ) => Promise<ResultOf<K> | undefined>;

  /** Close an active modal */
  closeModal: <K extends string>(id: K, result?: ResultOf<K>) => void;
  /** Close every active modal */
  closeAllModals: () => void;
}

// Keep modal mounted with isOpen=false for this long so exit animation can play
const EXIT_ANIMATION_MS = 220;

const pendingRemoval = new Map<string, ReturnType<typeof setTimeout>>();

export const useModalStore = create<ModalState>((set, get) => ({
  modals: new Map(),
  activeModals: new Map(),
  nextOrder: 0,

  registerModal: (config) => {
    set((state) => {
      const existing = state.modals.get(config.id);
      if (existing && existing.component !== config.component) {
        // Dev-time warning for accidental ID collisions
        console.warn(
          `Modal "${config.id}" is being re-registered with a different component`
        );
      }
      const newModals = new Map(state.modals);
      newModals.set(config.id, config);
      return { modals: newModals };
    });
  },

  unregisterModal: (id) => {
    set((state) => {
      const newModals = new Map(state.modals);
      newModals.delete(id);
      // If active - resolve as cancelled and remove
      const active = state.activeModals.get(id);
      if (active) {
        active.resolve(undefined);
        const newActive = new Map(state.activeModals);
        newActive.delete(id);
        return { modals: newModals, activeModals: newActive };
      }
      return { modals: newModals };
    });
  },

  // Generic default can't satisfy the per-call props type, so widen it here
  openModal: (
    id,
    props = {} as Omit<PropsOf<typeof id>, "isOpen" | "onClose">
  ) => {
    return new Promise((resolve) => {
      const { modals, activeModals } = get();
      if (!modals.has(id)) {
        console.warn(`Modal "${id}" is not registered`);
        resolve(undefined);
        return;
      }

      // If already open - resolve previous as cancelled before reopening
      const prev = activeModals.get(id);
      if (prev) prev.resolve(undefined);

      // If reopening before previous removal timer fired - cancel it
      const pendingTimer = pendingRemoval.get(id);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingRemoval.delete(id);
      }

      const order = get().nextOrder + 1;

      const onClose = (result?: any) => {
        const current = get().activeModals.get(id);
        if (!current || current.props.isOpen === false) return;
        current.resolve(result);
        // Phase 1: flip isOpen=false so base-ui triggers data-closed exit animation
        set((state) => {
          const next = new Map(state.activeModals);
          next.set(id, {
            ...current,
            props: { ...current.props, isOpen: false },
          });
          return { activeModals: next };
        });
        // Phase 2: actually remove after the exit animation finishes
        const timer = setTimeout(() => {
          pendingRemoval.delete(id);
          set((state) => {
            const next = new Map(state.activeModals);
            next.delete(id);
            return { activeModals: next };
          });
        }, EXIT_ANIMATION_MS);
        pendingRemoval.set(id, timer);
      };

      set((state) => {
        const next = new Map(state.activeModals);
        next.set(id, {
          id,
          order,
          resolve,
          props: {
            id,
            isOpen: true,
            onClose,
            ...(props as object),
          },
        });
        return { activeModals: next, nextOrder: order };
      });
    });
  },

  closeModal: (id, result) => {
    const active = get().activeModals.get(id);
    if (!active) return;
    // Delegate to the onClose installed on props so exit animation runs
    active.props.onClose(result);
  },

  closeAllModals: () => {
    const { activeModals } = get();
    activeModals.forEach((m) => m.props.onClose(undefined));
  },
}));

installModalDevtools();

// Imperative API for use outside React components
export const modalApi = {
  open: <K extends string>(
    id: K,
    props?: Omit<PropsOf<K>, "isOpen" | "onClose">
  ): Promise<ResultOf<K> | undefined> =>
    useModalStore.getState().openModal(id, props),

  close: <K extends string>(id: K, result?: ResultOf<K>) =>
    useModalStore.getState().closeModal(id, result),

  closeAll: () => useModalStore.getState().closeAllModals(),
};
