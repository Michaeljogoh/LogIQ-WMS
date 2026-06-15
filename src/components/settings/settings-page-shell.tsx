import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsPage({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("flex flex-1 flex-col gap-6 p-6", className)}>
      {children}
    </div>
  );
}

export function SettingsPanel({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return (
    <section className={cn("settings-panel", className)}>{children}</section>
  );
}

export function SettingsPanelHeader({
  actions,
  description,
  icon: Icon,
  title,
}: Readonly<{
  actions?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  title: string;
}>) {
  return (
    <header className="settings-panel-header">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {Icon ? (
          <div className="settings-panel-icon">
            <Icon className="size-5" aria-hidden />
          </div>
        ) : null}
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function SettingsPanelBody({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("settings-panel-body", className)}>{children}</div>
  );
}

export function SettingsListItem({
  actions,
  children,
  className,
}: Readonly<{
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("settings-list-item", className)}>
      <div className="min-w-0 flex-1">{children}</div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function SettingsFilterBar({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("settings-filter-bar", className)}>{children}</div>
  );
}

export function SettingsTableWrap({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("settings-table-wrap", className)}>{children}</div>
  );
}
