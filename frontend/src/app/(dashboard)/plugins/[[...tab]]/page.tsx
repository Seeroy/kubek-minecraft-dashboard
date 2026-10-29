import { PluginModalsRegistration } from "@/modules/plugins";
import { CONTENT_TABS } from "@/modules/plugins/lib/tabs";
import ContentDashboard from "@/modules/plugins/ui/ContentDashboard";
import { tabStaticParams } from "@/shared/lib/routeTabs";

export const generateStaticParams = () => tabStaticParams(CONTENT_TABS);

const PluginsPage = () => {
  return (
    <div>
      <ContentDashboard kind="plugin" />
      <PluginModalsRegistration/>
    </div>
  );
};

export default PluginsPage;
