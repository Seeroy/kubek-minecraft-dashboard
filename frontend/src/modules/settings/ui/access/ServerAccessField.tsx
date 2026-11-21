"use client";

import { useServerStore } from "@/modules/server";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { cn } from "@/shared/lib/cn";
import { Checkbox } from "@/shared/ui/checkbox";
import { Switch } from "@/shared/ui/switch";
import { Controller, useWatch, type Control, type FieldPathByValue, type FieldValues } from "react-hook-form";

const toggleIn = (list: string[], id: string, on: boolean) => (on ? [...list, id] : list.filter((item) => item !== id));

interface ServerAccessFieldProps<T extends FieldValues> {
  control: Control<T>;
  restrictName: FieldPathByValue<T, boolean>;
  serversName: FieldPathByValue<T, string[]>;
  label: string;
  restrictLabel: string;
  emptyLabel: string;
}

export function ServerAccessField<T extends FieldValues>({ control, restrictName, serversName, label, restrictLabel, emptyLabel }: ServerAccessFieldProps<T>) {
  const { servers } = useServerStore();
  const restrict = useWatch({ control, name: restrictName }) as boolean;

  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{label}</span>
        <Controller
          control={control}
          name={restrictName}
          render={({ field }) => (
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-medium">
              {restrictLabel}
              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />
      </div>
      {servers.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">{emptyLabel}</p>
      ) : (
        <Controller
          control={control}
          name={serversName}
          render={({ field }) => (
            <div className={cn("flex flex-wrap gap-1.5 transition-opacity", !restrict && "pointer-events-none opacity-40")}>
              {servers.map((server) => (
                <label
                  key={server.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border py-1.5 pr-2.5 pl-2 hover:bg-hover has-data-checked:border-primary/50 has-data-checked:bg-primary/6"
                >
                  <Checkbox
                    // Unrestricted means every server, so all look picked
                    checked={!restrict || (field.value as string[]).includes(server.id)}
                    disabled={!restrict}
                    onCheckedChange={(checked) => field.onChange(toggleIn(field.value as string[], server.id, checked))}
                  />
                  <ServerAvatar serverId={server.id} name={server.name} className="size-5 rounded-[5px]" />
                  <span className="text-[13px] font-medium">{server.name}</span>
                </label>
              ))}
            </div>
          )}
        />
      )}
    </section>
  );
}
