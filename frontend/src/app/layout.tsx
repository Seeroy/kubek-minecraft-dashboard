import { colorThemeBootScript } from "@/shared/lib/color-theme";
import { pageWidthBootScript } from "@/shared/lib/page-width";
import { sidebarBootScript } from "@/shared/lib/sidebar-layout";
import "@/shared/styles/globals.css";
import type { Viewport } from "next";
import localFont from "next/font/local";
import Providers from "./_providers/providers";

const onest = localFont({
  src: [
    { path: "./fonts/onest-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/onest-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/onest-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/onest-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-onest",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/jetbrains-mono-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${onest.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: colorThemeBootScript + sidebarBootScript + pageWidthBootScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
