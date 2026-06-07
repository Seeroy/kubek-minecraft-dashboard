import { useNotificationsContext } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useCreateBackupMutation } from "@/modules/backups/api/backups.queries";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { buildBackupPayload } from "../utils/buildBackupPayload";
import {
  CreateBackupFormValues,
  createBackupSchema,
} from "../validations/schema";

const createDefaultValues = (): CreateBackupFormValues => ({
  name: "",
  description: "",
  type: "full",
  compressionRatio: 6,
  format: "zip",
  selectionMode: "all",
  selectedFiles: [],
  globExceptions: [],
});

interface UseCreateBackupFormParams {
  isOpen: boolean;
  onClose: () => void;
  serverId?: string;
}

export function useCreateBackupForm({
  isOpen,
  onClose,
  serverId,
}: UseCreateBackupFormParams) {
  const { t } = useTranslation("modules.backups");
  const { addNotification } = useNotificationsContext();
  const { selectedServer } = useServerStore();

  const form = useForm<CreateBackupFormValues>({
    resolver: zodResolver(createBackupSchema),
    defaultValues: createDefaultValues(),
    mode: "onChange",
  });

  const currentServerId = serverId || selectedServer?.id;
  const createBackupMutation = useCreateBackupMutation(currentServerId);
  const backupType = form.watch("type");
  const selectionMode = form.watch("selectionMode");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      form.reset(createDefaultValues());
    }
  }, [form, isOpen, currentServerId]);

  const onSubmit = useCallback(
    async (values: CreateBackupFormValues) => {
      if (!currentServerId) {
        addNotification({
          title: t("modals.createBackup.notifications.noServerSelected"),
          message: t(
            "modals.createBackup.notifications.noServerSelectedMessage"
          ),
          type: "error",
          duration: 5000,
          icon: TriangleAlert,
        });
        return;
      }

      try {
        const payload = buildBackupPayload(values, currentServerId);

        onClose();
        createBackupMutation.mutateAsync(payload);
        form.reset(createDefaultValues());
      } catch (error: any) {
        addNotification({
          title: t("modals.createBackup.notifications.createFailed"),
          message:
            error.message ||
            t("modals.createBackup.notifications.createFailedMessage"),
          type: "error",
          duration: 8000,
          icon: TriangleAlert,
        });
      }
    },
    [form, addNotification, onClose, currentServerId, createBackupMutation, t]
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return {
    form,
    backupType,
    selectionMode,
    currentServerId,
    onSubmit,
    handleOpenChange,
  };
}
