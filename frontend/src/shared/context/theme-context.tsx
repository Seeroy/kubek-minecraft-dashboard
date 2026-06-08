"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ColorTheme = "default" | "amethyst" | "cosmic-night" | "green";

interface ColorThemeContextType {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(
  undefined
);

export function ColorThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<ColorTheme>("default");

  useEffect(() => {
    const saved = localStorage.getItem("colorTheme") as ColorTheme;
    if (saved) {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    // Apply theme to root document
    const root = document.documentElement;
    root.classList.remove(
      "theme-amethyst",
      "theme-cosmic-night",
      "theme-green"
    );
    if (theme !== "default") {
      root.classList.add(`theme-${theme}`);
    }

    localStorage.setItem("colorTheme", theme);
  }, [theme]);

  return (
    <ColorThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (context === undefined) {
    throw new Error("useColorTheme must be used within a ColorThemeContext");
  }
  return context;
}
