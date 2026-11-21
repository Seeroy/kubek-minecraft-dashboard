import { ExtensionsManager } from "@/modules/extensions";
import { EXTENSION_TABS } from "@/modules/extensions/lib/tabs";
import { tabStaticParams } from "@/shared/lib/routeTabs";

export const generateStaticParams = () => tabStaticParams(EXTENSION_TABS);

const ExtensionsPage = () => {
  return <ExtensionsManager />;
};

export default ExtensionsPage;
