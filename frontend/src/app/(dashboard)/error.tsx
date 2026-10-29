"use client";

import { CrashScreen } from "@/shared/ui/ErrorBoundary";

// keeps the sidebar when a page crashes
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <CrashScreen error={error} reset={reset} />;
}
