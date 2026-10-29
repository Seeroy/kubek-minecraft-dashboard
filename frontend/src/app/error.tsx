"use client";

import { CrashScreen } from "@/shared/ui/ErrorBoundary";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <CrashScreen error={error} reset={reset} />
    </main>
  );
}
