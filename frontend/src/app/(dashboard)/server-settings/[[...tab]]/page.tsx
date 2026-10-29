import { ServerSettings } from "@/modules/server-settings";
import { SERVER_SETTINGS_TABS } from "@/modules/server-settings/lib/tabs";
import { tabStaticParams } from "@/shared/lib/routeTabs";

export const generateStaticParams = () => tabStaticParams(SERVER_SETTINGS_TABS);

const ParametersPage = () => {
  return (
    <div>
      <ServerSettings/>
    </div>
  );
};

export default ParametersPage;
