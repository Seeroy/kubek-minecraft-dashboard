"use client"

import type * as React from "react"

import { useTranslation } from "@/shared/hooks/useTranslation"
import { cn } from "@/shared/lib/cn"
import { Button } from "@/shared/ui/button"
import { Panel } from "@/shared/ui/panel"
import { Plate } from "@/shared/ui/plate"
import { Spinner } from "@/shared/ui/spinner"
import { type Tone, toneClass } from "@/shared/ui/tone"

interface SettingsGroupProps {
  tone: Tone
  icon: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  description?: React.ReactNode
  note?: React.ReactNode
  // Children go straight under the header, for tables and other full width content
  flush?: boolean
  className?: string
  children: React.ReactNode
}

/** A titled block of settings, its tone colors the header, plate and field icons */
function SettingsGroup({ tone, icon: Icon, title, description, note, flush, className, children }: SettingsGroupProps) {
  return (
    <Panel data-slot="settings-group" className={cn(toneClass[tone], "mb-6 overflow-hidden", className)}>
      <header className="flex items-center justify-between gap-4 border-b border-border bg-linear-to-r from-tone/5 to-transparent px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[17px] leading-tight font-semibold text-tone">{title}</h3>
          {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
        </div>
        <Plate tone={tone} size="xl">
          <Icon />
        </Plate>
      </header>
      {flush ? children : <div className="grid gap-x-6 gap-y-5 p-5 md:grid-cols-2">{children}</div>}
      {note && (
        <div className="border-t border-border px-5 py-3">
          <p className="rounded-md border border-warn/25 bg-warn/9 px-3 py-2 text-[12.5px] text-[color-mix(in_oklch,var(--warn),var(--foreground)_30%)]">
            {note}
          </p>
        </div>
      )}
    </Panel>
  )
}

interface SettingsFieldProps {
  label: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  hint?: React.ReactNode
  // Shown in danger color, e.g. what turning a switch off breaks
  warning?: React.ReactNode
  changed?: boolean
  wide?: boolean
  htmlFor?: string
  // Label and hint on the left, a small control (switch) on the right
  inline?: boolean
  children: React.ReactNode
}

function SettingsField({ label, icon: Icon, hint, warning, changed, wide, htmlFor, inline, children }: SettingsFieldProps) {
  const { t } = useTranslation("modules.components.settings")
  const heading = (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        data-changed={changed || undefined}
        className="flex items-center gap-1.5 text-[13px] font-medium data-changed:text-primary"
      >
        {Icon && <Icon className="size-3.5 shrink-0 text-tone" />}
        {label}
        {changed && (
          <span className="rounded-full bg-primary/14 px-1.5 text-[10.5px] font-medium text-primary">{t("changed")}</span>
        )}
      </label>
      {hint && <p className="mt-1 text-[12.5px] text-muted-foreground">{hint}</p>}
      {warning && <p className="mt-1 text-[12.5px] text-danger">{warning}</p>}
    </div>
  )

  if (inline) {
    return (
      <div
        data-slot="settings-field"
        data-inline=""
        className="col-span-full flex items-center justify-between gap-4 [[data-inline]+&]:-mt-2 [[data-inline]+&]:border-t [[data-inline]+&]:border-border [[data-inline]+&]:pt-3"
      >
        {heading}
        {children}
      </div>
    )
  }

  return (
    <div data-slot="settings-field" className={cn("grid content-start gap-2", wide && "col-span-full")}>
      {heading}
      {children}
    </div>
  )
}

interface SaveBarProps {
  count: number
  saving: boolean
  onSave: () => void
  onReset: () => void
}

/** Floating bar that appears while there are unsaved changes */
function SaveBar({ count, saving, onSave, onReset }: SaveBarProps) {
  const { t } = useTranslation("modules.components.settings")
  if (count === 0) return null

  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit max-w-full animate-toast-in items-center gap-3 rounded-xl border border-border bg-popover py-2 pr-2 pl-4 text-[13px] shadow-pop">
      <span className="font-medium">{t("unsaved", count)}</span>
      <Button variant="ghost" onClick={onReset} disabled={saving}>
        {t("reset")}
      </Button>
      <Button onClick={onSave} disabled={saving}>
        {saving && <Spinner />}
        {t("save")}
      </Button>
    </div>
  )
}

export { SaveBar, SettingsField, SettingsGroup }
