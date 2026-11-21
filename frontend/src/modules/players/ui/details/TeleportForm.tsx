"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { MapPin } from "lucide-react";
import { useState } from "react";
import type { usePlayerCommand } from "../../hooks/usePlayerCommand";
import { DIMENSIONS, parseCoords } from "../../lib/player-details";

// Select can't hold an empty value, this one means where the player is now
const CURRENT = "current";
const AXES = ["x", "y", "z"] as const;

interface TeleportFormProps {
  name: string;
  /** 1.12 and older can't switch dimension with tp */
  legacy: boolean;
  command: ReturnType<typeof usePlayerCommand>;
}

export function TeleportForm({ name, legacy, command }: TeleportFormProps) {
  const { t } = useTranslation("modules.players.details");
  const [coords, setCoords] = useState({ x: "", y: "", z: "" });
  const [dimension, setDimension] = useState(CURRENT);
  const target = parseCoords(coords);

  const submit = () => {
    if (!target) return;
    const data = { name, ...target, dimension: dimension === CURRENT ? undefined : dimension };
    void command.run({ kind: "teleport", data }, t("toasts.teleported", name));
  };

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
        {AXES.map((axis) => (
          <Input
            key={axis}
            inputMode="decimal"
            placeholder={axis.toUpperCase()}
            aria-label={axis.toUpperCase()}
            value={coords[axis]}
            onChange={(event) => setCoords((prev) => ({ ...prev, [axis]: event.target.value }))}
          />
        ))}
        {!legacy && (
          <Select<string> value={dimension} onValueChange={(value) => value && setDimension(value)}>
            <SelectTrigger aria-label={t("dimension")} className="max-sm:col-span-3">
              <SelectValue>{(value: string) => (value === CURRENT ? t("currentDimension") : t(`dimensions.${value}`))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CURRENT}>{t("currentDimension")}</SelectItem>
              {DIMENSIONS.map((id) => (
                <SelectItem key={id} value={id}>
                  {t(`dimensions.${id}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <Button className="justify-self-start" disabled={!target || command.pending} onClick={submit}>
        {command.pending ? <Spinner /> : <MapPin />}
        {t("teleport")}
      </Button>
    </div>
  );
}
