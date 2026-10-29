import { Scheduler } from "@/modules/scheduler";
import { SCHEDULER_TABS } from "@/modules/scheduler/lib/tabs";
import { tabStaticParams } from "@/shared/lib/routeTabs";

export const generateStaticParams = () => tabStaticParams(SCHEDULER_TABS);

const SchedulerPage = () => {
  return (
    <div>
      <Scheduler />
    </div>
  );
};

export default SchedulerPage;
