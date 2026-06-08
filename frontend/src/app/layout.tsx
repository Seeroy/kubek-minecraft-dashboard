import "@/shared/styles/globals.css";
import type { Viewport } from "next";
import localFont from "next/font/local";
import Providers from "./_providers/providers";

const onest = localFont({
  src: [
    { path: "./fonts/onest-300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/onest-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/onest-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/onest-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/onest-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/onest-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-onest",
  display: "swap",
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
    <html lang="en" suppressHydrationWarning className={onest.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
