"use client";

import PluginsDashboard from "@/modules/plugins/ui/PluginsDashboard";

/**
 * Reuses the shared Modrinth content dashboard configured
 * for the mod content kind (mods folder, Fabric loader, mod task types)
 */
const ModsDashboard = () => <PluginsDashboard kind="mod" />;

export default ModsDashboard;
