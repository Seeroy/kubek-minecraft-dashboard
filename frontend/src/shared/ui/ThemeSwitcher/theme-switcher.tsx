"use client";

import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeSwitch() {
  // Drive theme through next-themes
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Before mount next-themes hasn't resolved the stored value yet; show "system"
  // to avoid a hydration mismatch
  const value = mounted ? (theme ?? "system") : "system";

  return (
    <Tabs value={value} onValueChange={setTheme}>
      <TabsList className="h-6! gap-0 p-0!">
        <TabsTrigger
          value="system"
          className="h-6 w-6 rounded-xl p-0"
          title="System"
        >
          <Monitor className="h-3.5! w-3.5!" />
        </TabsTrigger>
        <TabsTrigger
          value="light"
          className="h-6 w-6 rounded-xl p-0"
          title="Light"
        >
          <Sun className="h-3.5! w-3.5!" />
        </TabsTrigger>
        <TabsTrigger
          value="dark"
          className="h-6 w-6 rounded-xl p-0"
          title="Dark"
        >
          <Moon className="h-3.5! w-3.5!" />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
