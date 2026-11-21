import { ServerTypesManager } from "@/modules/server-types";
import { SERVER_TYPE_TABS } from "@/modules/server-types/lib/tabs";
import { tabStaticParams } from "@/shared/lib/routeTabs";

export const generateStaticParams = () => tabStaticParams(SERVER_TYPE_TABS);

const ServerTypesPage = () => {
  return <ServerTypesManager />;
};

export default ServerTypesPage;
