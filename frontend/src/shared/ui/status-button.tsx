import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Check, Loader2, Save, X } from "lucide-react";
import { ComponentProps, useEffect, useState } from "react";

type ButtonProps = ComponentProps<typeof Button>;

export type StatusButtonState = "idle" | "loading" | "success" | "error";

interface StatusButtonProps extends Omit<ButtonProps, "onClick"> {
  onSave: () => Promise<any> | void;
  state?: StatusButtonState;
  onStateChange?: (state: StatusButtonState) => void;
  autoReset?: boolean;
  resetDelay?: number;
  idleText?: string;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  idleIcon?: React.ReactNode;
}

export function StatusButton({
                               onSave,
                               state: externalState,
                               onStateChange,
                               autoReset = true,
                               resetDelay = 1400,
                               idleText,
                               loadingText,
                               successText,
                               errorText,
                               idleIcon = <Save className="h-4 w-4"/>,
                               className,
                               ...props
                             }: StatusButtonProps) {
  const [internalState, setInternalState] = useState<StatusButtonState>("idle");
  const { t } = useTranslation("modules.components.statusButton");

  // Use the controlled state when provided, otherwise the internal one
  const state = externalState !== undefined ? externalState : internalState;

  const setState = (newState: StatusButtonState) => {
    if (externalState !== undefined) {
      onStateChange?.(newState);
    } else {
      setInternalState(newState);
    }
  };

  const handleClick = async () => {
    if (state !== "idle") return;

    setState("loading");

    try {
      await onSave();
      setState("success");
    } catch (error) {
      setState("error");
    }
  };

  useEffect(() => {
    if (autoReset && (state === "success" || state === "error")) {
      const timer = setTimeout(() => {
        setState("idle");
      }, resetDelay);

      return () => clearTimeout(timer);
    }
  }, [state, autoReset, resetDelay]);

  const getButtonContent = () => {
    switch (state) {
      case "loading":
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary"/>
            { loadingText || t("loading") }
          </>
        );
      case "success":
        return (
          <>
            <Check className="h-4 w-4 text-green-500"/>
            { successText || t("success") }
          </>
        );
      case "error":
        return (
          <>
            <X className="h-4 w-4 text-red-500"/>
            { errorText || t("error") }
          </>
        );
      default:
        return (
          <>
            { idleIcon }
            { idleText || t("idle") }
          </>
        );
    }
  };

  // Pick the variant based on the current state
  const getVariant = () => {
    if (state === "idle") {
      return props.variant || "default";
    }
    return "secondary";
  };

  return (
    <Button
      onClick={ handleClick }
      disabled={ state !== "idle" }
      variant={ getVariant() }
      className={
        state !== "idle"
          ? `disabled:opacity-100 ${ className || '' }`
          : className
      }
      { ...props }
    >
      { getButtonContent() }
    </Button>
  );
}