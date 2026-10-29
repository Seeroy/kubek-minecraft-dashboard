"use client";

import ContentDashboard from "@/modules/plugins/ui/ContentDashboard";

// Same Modrinth manager as plugins, wired to the mods folder and the Fabric loader
const ModsDashboard = () => <ContentDashboard kind="mod" />;

export default ModsDashboard;
