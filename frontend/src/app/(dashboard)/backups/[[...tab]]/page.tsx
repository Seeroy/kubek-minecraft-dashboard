import { Backups } from "@/modules/backups";
import { BACKUP_TABS } from "@/modules/backups/lib/tabs";
import { tabStaticParams } from "@/shared/lib/routeTabs";

export const generateStaticParams = () => tabStaticParams(BACKUP_TABS);

const BackupsPage = () => {
  return (
    <div>
      <Backups />
    </div>
  );
};

export default BackupsPage;
