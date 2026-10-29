import { Settings } from "@/modules/settings";
import { SETTINGS_EXT_TAB, SETTINGS_TABS } from "@/modules/settings/lib/tabs";
import { tabStaticParams } from "@/shared/lib/routeTabs";
import { Suspense } from "react";

export const generateStaticParams = () => tabStaticParams([...SETTINGS_TABS, SETTINGS_EXT_TAB]);

// Extension tabs read ?panel=, search params need a Suspense boundary in a static export
const SettingsPage = () => {
  return (
    <div>
      <Suspense fallback={null}>
        <Settings />
      </Suspense>
    </div>
  );
};

export default SettingsPage;
