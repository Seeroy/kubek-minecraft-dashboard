"use client";
import { ExtensionPage } from "@/modules/extensions";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * Mount point for extension full-page views. The app is a static export, which has no dynamic route
 * segments, so the target rides in a ?view= param (/ext?view=<extId>/<Component>) read here
 */
const ExtRouteInner = () => {
  const params = useSearchParams();
  const view = params.get("view") ?? "";
  const slug = view.split("/").filter(Boolean);
  return <ExtensionPage slug={slug} />;
};

const ExtRoutePage = () => (
  <Suspense fallback={null}>
    <ExtRouteInner />
  </Suspense>
);

export default ExtRoutePage;
