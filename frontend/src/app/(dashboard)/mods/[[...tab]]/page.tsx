import ModsDashboard from "@/modules/mods/ui/ModsDashboard";
import { PluginModalsRegistration } from "@/modules/plugins";
import { CONTENT_TABS } from "@/modules/plugins/lib/tabs";
import { tabStaticParams } from "@/shared/lib/routeTabs";

export const generateStaticParams = () => tabStaticParams(CONTENT_TABS);

const ModsPage = () => {
  return (
    <div>
      <ModsDashboard/>
      <PluginModalsRegistration/>
    </div>
  );
};

export default ModsPage;
