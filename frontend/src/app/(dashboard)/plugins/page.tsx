"use client";
import { PluginModalsRegistration } from "@/modules/plugins";
import PluginsDashboard from "@/modules/plugins/ui/PluginsDashboard";

const PluginsPage = () => {
  return (
    <div>
      <PluginsDashboard/>
      <PluginModalsRegistration/>
    </div>
  );
};

export default PluginsPage;
