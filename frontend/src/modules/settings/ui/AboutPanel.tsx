"use client";

import { ChangelogTimeline } from "./about/ChangelogTimeline";
import { PanelInfoCard } from "./about/PanelInfoCard";

export default function AboutPanel() {
  return (
    <div className="space-y-6">
      <PanelInfoCard />
      <ChangelogTimeline />
    </div>
  );
}
