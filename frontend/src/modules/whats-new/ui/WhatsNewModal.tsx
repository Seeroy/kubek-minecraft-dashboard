"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/dialog";
import LogoMark from "@/shared/ui/logo-mark";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type React from "react";
import { findRelease } from "../data/releases";

export interface WhatsNewModalProps {
  version: string;
}

export const WHATS_NEW_MODAL_ID = "whats-new";

const GITHUB_REPO = "Seeroy/kubek-minecraft-dashboard";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "whats-new": { props: WhatsNewModalProps; result: void };
  }
}

const WhatsNewModal: React.FC<ModalProps<void> & WhatsNewModalProps> = ({
  isOpen,
  onClose,
  version,
}) => {
  const { t } = useTranslation("modules.whatsNew");
  const reduceMotion = useReducedMotion();
  const release = findRelease(version);
  const highlights = release?.highlights ?? [];

  // Stagger the highlights in after the dialog has settled
  const list = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
  };
  const item = reduceMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 10 },
        show: {
          opacity: 1,
          y: 0,
          transition: { type: "spring" as const, stiffness: 380, damping: 30 },
        },
      };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        {/* Hero */}
        <div className="relative flex flex-col items-center px-6 pt-9 pb-6 text-center">
          {/* Soft accent glow behind the badge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 blur-2xl bg-[radial-gradient(ellipse_at_top,theme(colors.primary/8),transparent_70%)]"
          />
          <motion.div
            initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="relative mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm"
          >
            <LogoMark size={30} />
          </motion.div>

          <span className="relative mb-3 inline-flex items-center rounded-full border border-border/60 bg-secondary px-3 py-1 font-mono text-xs font-medium text-muted-foreground">
            v{version}
          </span>

          <DialogTitle className="relative text-xl font-semibold tracking-tight">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="relative mt-1.5 max-w-sm text-pretty">
            {t("subtitle")}
          </DialogDescription>
        </div>

        {/* Highlights */}
        <motion.ul
          variants={list}
          initial="hidden"
          animate="show"
          className="space-y-1 px-6 pb-2"
        >
          {highlights.map((h) => {
            const Icon = h.icon;
            return (
              <motion.li
                key={h.titleKey}
                variants={item}
                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-secondary/60"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-[18px]" />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {t(h.titleKey)}
                </span>
              </motion.li>
            );
          })}
        </motion.ul>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 px-6 py-4">
          <a
            href={`https://github.com/${GITHUB_REPO}/releases/tag/v${version}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {t("fullChangelog")}
            <ExternalLink className="size-3.5" />
          </a>
          <Button onClick={() => onClose()}>{t("gotIt")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsNewModal;
