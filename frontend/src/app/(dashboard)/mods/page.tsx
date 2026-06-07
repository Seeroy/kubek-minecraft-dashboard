"use client";
import ModsDashboard from "@/modules/mods/ui/ModsDashboard";
import { PluginModalsRegistration } from "@/modules/plugins";

const ModsPage = () => {
  return (
    <div>
      <ModsDashboard/>
      <PluginModalsRegistration/>
    </div>
  );
};

export default ModsPage;
