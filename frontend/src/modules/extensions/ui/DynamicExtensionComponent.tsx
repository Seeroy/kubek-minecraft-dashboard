"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { ErrorBoundary, type ErrorFallbackProps } from "@/shared/ui/ErrorBoundary";
import { Loader2 } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { createElement, useEffect, useState } from "react";
import { loadExtensionComponent } from "../runtime/loader";

interface Props {
  bundleUrl: string;
  /** name of the component exported by the extension's KubekFrontendModule */
  name: string;
  /** props forwarded to the extension component */
  props?: Record<string, unknown>;
  // shown on render crash, short inline line by default
  fallback?: (props: ErrorFallbackProps) => ReactNode;
}

const ExtensionError = ({ message }: { message: string }) => {
  const { t } = useTranslation("modules.shared.crash");
  return (
    <div className="text-xs text-destructive">
      {t("extension")}: {message}
    </div>
  );
};

/** Lazily imports and renders a single extension component, guarding load and render failures */
export const DynamicExtensionComponent = ({ bundleUrl, name, props, fallback }: Props) => {
  const [Component, setComponent] = useState<ComponentType<Record<string, unknown>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setComponent(null);
    setError(null);
    loadExtensionComponent(bundleUrl, name)
      .then((c) => alive && setComponent(() => c))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [bundleUrl, name]);

  if (error) return <ExtensionError message={error} />;
  if (!Component) {
    return (
      <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
      </div>
    );
  }
  return (
    <ErrorBoundary resetKey={Component} fallback={fallback ?? (({ error }) => <ExtensionError message={error.message} />)}>
      {createElement(Component, props ?? {})}
    </ErrorBoundary>
  );
};
