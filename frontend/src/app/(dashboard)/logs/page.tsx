import { LogViewer } from "@/modules/log-viewer";
import { Suspense } from "react";

const LogsPage = () => {
  return (
    <Suspense>
      <LogViewer />
    </Suspense>
  );
};

export default LogsPage;
