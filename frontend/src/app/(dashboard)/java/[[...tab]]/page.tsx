import { JavaManager } from "@/modules/java-manager";
import { JAVA_TABS } from "@/modules/java-manager/lib/tabs";
import { tabStaticParams } from "@/shared/lib/routeTabs";

export const generateStaticParams = () => tabStaticParams(JAVA_TABS);

const JavaPage = () => {
  return (
    <div>
      <JavaManager/>
    </div>
  );
};

export default JavaPage;
