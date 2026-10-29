"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/shared/ui/input-group";
import { Spinner } from "@/shared/ui/spinner";
import type { SecretHint } from "@shared/types/secret.types";
import { Eye, EyeOff } from "lucide-react";
import { useRef, useState, type ComponentProps, type Ref } from "react";

interface SecretInputProps extends Omit<ComponentProps<"input">, "type"> {
  /** State of the stored value, the API never sends the value itself */
  secret?: SecretHint;
  /** Fetches the stored value, called once when the user asks to see it */
  onReveal?: () => Promise<string | null>;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/**
 * Password-style input for a stored secret. A blank field keeps the stored value,
 * so the placeholder says one is saved instead of showing it
 */
export function SecretInput({ secret, onReveal, placeholder, ref, ...props }: SecretInputProps) {
  const { t } = useTranslation("modules.components.secret");
  const [shown, setShown] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const stored = !!secret?.set;

  const toggle = async () => {
    if (shown) return setShown(false);
    // A typed value is shown as is, only an untouched field needs the stored one
    if (stored && !input.current?.value && onReveal) {
      setRevealing(true);
      try {
        await onReveal();
      } finally {
        setRevealing(false);
      }
    }
    setShown(true);
  };

  const savedPlaceholder = secret?.hint ? t("savedHint", secret.hint) : t("saved");

  return (
    <InputGroup>
      <InputGroupInput
        type={shown ? "text" : "password"}
        className="font-mono"
        autoComplete="off"
        placeholder={stored ? savedPlaceholder : placeholder}
        ref={(el) => {
          input.current = el;
          assignRef(ref, el);
        }}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={shown ? t("hide") : t("show")}
          title={shown ? t("hide") : t("show")}
          aria-pressed={shown}
          disabled={props.disabled || revealing}
          onClick={() => void toggle()}
        >
          {revealing ? <Spinner /> : shown ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
