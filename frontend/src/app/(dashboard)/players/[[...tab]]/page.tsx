import { CompanionModalsRegistration } from "@/modules/companion/modals";
import { Players } from "@/modules/players";
import { PlayersModalsRegistration } from "@/modules/players/modals";
import { PLAYERS_TABS } from "@/modules/players/lib/players";
import { tabStaticParams } from "@/shared/lib/routeTabs";

export const generateStaticParams = () => tabStaticParams(PLAYERS_TABS);

const PlayersPage = () => {
  return (
    <div>
      <Players />
      <CompanionModalsRegistration />
      <PlayersModalsRegistration />
    </div>
  );
};

export default PlayersPage;
