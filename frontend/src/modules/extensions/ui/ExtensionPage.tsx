"use client";

import { useExtensionRegistry } from "@/modules/extensions/api/extensions.queries";
import { PageError } from "@/shared/ui/PageError";
import { PageLayout } from "@/shared/ui/PageLayout";
import { DynamicExtensionComponent } from "./DynamicExtensionComponent";

interface Props {
  /** catch-all slug from /ext/[...slug]: [extId, ...componentPath] */
  slug: string[];
}

export const ExtensionPage = ({ slug }: Props) => {
  const { data: registry, isLoading } = useExtensionRegistry();
  const [extId, ...rest] = slug;
  const componentName = rest.join("/") || "Page";

  if (isLoading) return null;
  const ext = (registry ?? []).find((e) => e.id === extId);
  if (!ext) {
    return (
      <PageLayout>
        <PageError message={`No active extension "${extId}"`} />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <DynamicExtensionComponent
        bundleUrl={ext.bundleUrl}
        name={componentName}
      />
    </PageLayout>
  );
};
