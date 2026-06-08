import { BackupStatus } from "@shared/types/backup.types";
import { AlertCircle, CheckCircle2, Loader2, Pause } from "lucide-react";

export const getStatusIcon = (status: BackupStatus) => {
  switch (status) {
    case BackupStatus.CREATING:
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case BackupStatus.COMPLETED:
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case BackupStatus.FAILED:
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case BackupStatus.PAUSED:
      return <Pause className="h-4 w-4 text-amber-500" />;
  }
};

export const getStatusBadgeVariant = (status: BackupStatus) => {
  switch (status) {
    case BackupStatus.COMPLETED:
      return "default";
    case BackupStatus.FAILED:
      return "destructive";
    case BackupStatus.CREATING:
      return "secondary";
    case BackupStatus.PAUSED:
      return "outline";
    default:
      return "outline";
  }
};
