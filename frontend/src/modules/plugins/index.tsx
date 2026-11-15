import { BulkInstallModalRegistration } from "./modals/BulkInstallModal";
import { InstallPluginModalRegistration } from "./modals/InstallPluginModal";
import { RemovePluginModalRegistration } from "./modals/RemovePluginModal";

export function PluginModalsRegistration() {
  return (
    <>
      <InstallPluginModalRegistration />
      <RemovePluginModalRegistration />
      <BulkInstallModalRegistration />
    </>
  );
}
