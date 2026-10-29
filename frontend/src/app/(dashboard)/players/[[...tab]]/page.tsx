import { Players } from "@/modules/players";
import { PLAYERS_TABS } from "@/modules/players/lib/players";
import { tabStaticParams } from "@/shared/lib/routeTabs";

export const generateStaticParams = () => tabStaticParams(PLAYERS_TABS);

const PlayersPage = () => {
  return (
    <div>
      <Players />
    </div>
  );
};

export default PlayersPage;
