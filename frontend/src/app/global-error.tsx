"use client";

import { translateStatic } from "@/locales";
import "@/shared/styles/globals.css";

// root layout is gone here, so no providers
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="grid min-h-dvh place-items-center bg-background p-4 text-foreground">
          <div className="flex max-w-sm flex-col items-center gap-2 text-center">
            <h1 className="text-lg font-medium">{translateStatic("modules.shared.crash.title") ?? "Something went wrong"}</h1>
            <p className="text-sm text-muted-foreground">{translateStatic("modules.shared.crash.description")}</p>
            <button type="button" onClick={reset} className="mt-2 h-8 rounded-md border border-border bg-card px-3 text-sm hover:bg-hover">
              {translateStatic("modules.shared.crash.retry") ?? "Try again"}
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
