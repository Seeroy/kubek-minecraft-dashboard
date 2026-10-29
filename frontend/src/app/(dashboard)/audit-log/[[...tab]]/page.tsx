import { AuditLog } from "@/modules/audit-log";
import { AUDIT_TABS } from "@/modules/audit-log/lib/tabs";
import { tabStaticParams } from "@/shared/lib/routeTabs";

export const generateStaticParams = () => tabStaticParams(AUDIT_TABS);

const AuditLogPage = () => {
  return <AuditLog />;
};

export default AuditLogPage;
