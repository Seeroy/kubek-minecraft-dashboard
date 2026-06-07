"use client";

import { api } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Button } from "@/shared/ui/button";
import LogoV2 from "@/shared/ui/logo-v2";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useState } from "react";

interface CompletionStepProps {
  serverCreated?: boolean;
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function CompletionStep({ serverCreated = false }: CompletionStepProps) {
  const updateUser = useAuthStore((state) => state.updateUser);
  const { t } = useTranslation("modules.oobe.completionStep");
  const [finishing, setFinishing] = useState(false);

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await api.auth.completeOOBE();
      updateUser({ oobeCompleted: true });
    } catch (error) {
      console.error("Failed to complete OOBE:", error);
    }
    window.location.href = "/";
  };

  const summary = [
    "licenseAccepted",
    "themeConfigured",
    ...(serverCreated ? ["serverCreated"] : []),
    "readyToManage",
  ] as const;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Single soft glow behind the content - calm, not a disco of blobs */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="pointer-events-none absolute top-1/3 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center text-center"
      >
        {/* Logo with a small confirmation badge */}
        <motion.div variants={item} className="relative mb-8 inline-flex">
          <LogoV2 size="xl" />
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.6,
              type: "spring",
              stiffness: 400,
              damping: 18,
            }}
            className="absolute -right-3 -bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white shadow-lg ring-4 ring-background"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </motion.span>
        </motion.div>

        <motion.h1
          variants={item}
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          {t("title")}
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-3 max-w-sm text-base text-muted-foreground"
        >
          {t("subtitle")}
        </motion.p>

        {/* Compact setup summary */}
        <motion.ul
          variants={item}
          className="mt-8 flex w-full flex-col gap-2 text-left"
        >
          {summary.map((key) => (
            <li
              key={key}
              className="flex items-center gap-3 rounded-lg border bg-card/40 px-4 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-500">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              <span className="text-sm font-medium text-foreground">
                {t(`features.${key}`)}
              </span>
            </li>
          ))}
        </motion.ul>

        <motion.div variants={item} className="mt-10 w-full">
          <Button
            size="lg"
            className="w-full gap-2 sm:w-auto sm:min-w-56"
            onClick={handleFinish}
            disabled={finishing}
          >
            {finishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {t("cta")}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
