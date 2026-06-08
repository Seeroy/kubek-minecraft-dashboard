import InputWithHistory from "@/shared/ui/InputWithHistory";
import React from "react";
import { useTranslation } from "../../../shared/hooks/useTranslation";

interface CommandInputProps {
  onInputSubmit?: (value: string) => void;
  extraSuggestions?: string[];
}

const CommandInput: React.FC<CommandInputProps> = ({
  onInputSubmit = () => {},
  extraSuggestions = [],
}) => {
  const { t } = useTranslation("modules.console");
  const sendCommand = (value: string) => {
    if (!value.trim()) return;
    onInputSubmit(value.trim());
  };

  return (
    <InputWithHistory
      inputClassName={"md:text-md text-md h-11 border-1"}
      placeholder={t("commandInput.placeholder")}
      onInputSubmit={sendCommand}
      extraSuggestions={extraSuggestions}
    />
  );
};

export default CommandInput;
