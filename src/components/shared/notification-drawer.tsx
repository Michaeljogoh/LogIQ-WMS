"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const SEVERITY_META = {
  CRITICAL: {
    badgeVariant: "destructive" as const,
    sectionClass: "notification-severity-section--critical",
    label: "Critical",
  },
  WARNING: {
    badgeVariant: "warning" as const,
    sectionClass: "notification-severity-section--warning",
    label: "Warning",
  },
  INFO: {
    badgeVariant: "info" as const,
    sectionClass: "notification-severity-section--info",
    label: "Info",
  },
};

export function NotificationDrawer({ trigger }: { trigger: ReactNode }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const accountId = (
    session.data?.user as { accountId?: string | null } | undefined
  )?.accountId;

  const notifications = useQuery({
    ...trpc.notifications.list.queryOptions({ limit: 50 }),
    enabled: Boolean(accountId),
  });
  const markRead = useMutation(
    trpc.notifications.markRead.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.notifications.list.queryFilter({ limit: 50 }),
        );
      },
    }),
  );
  const items = (notifications.data?.items ?? []) as Array<{
    id: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    title: string;
    body: string;
    readAt: Date | null;
    data: unknown;
  }>;
  const grouped = {
    CRITICAL: items.filter((item) => item.severity === "CRITICAL"),
    WARNING: items.filter((item) => item.severity === "WARNING"),
    INFO: items.filter((item) => item.severity === "INFO"),
  };
  const unreadCount = notifications.data?.unreadCount ?? 0;

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        className="notification-drawer w-full gap-0 sm:max-w-md"
        side="right"
      >
        <SheetHeader className="notification-drawer-header p-0">
          <SheetTitle className="text-base font-bold tracking-tight">
            Notifications
          </SheetTitle>
        </SheetHeader>

        <div className="notification-drawer-toolbar flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Unread</p>
            <Badge
              className="min-w-5 justify-center rounded-md px-1.5 tabular-nums"
              variant={unreadCount > 0 ? "destructive" : "secondary"}
            >
              {unreadCount}
            </Badge>
          </div>
          <Button
            className="h-8 transition-all duration-200"
            disabled={markRead.isPending || !unreadCount}
            onClick={() => markRead.mutate({ markAll: true })}
            size="sm"
            variant="outline"
          >
            Mark all read
          </Button>
        </div>

        <div className="notification-drawer-body space-y-3">
          {(["CRITICAL", "WARNING", "INFO"] as const).map((severity) => {
            const meta = SEVERITY_META[severity];
            return (
              <div
                className={cn(
                  "notification-severity-section space-y-2",
                  meta.sectionClass,
                )}
                key={severity}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {meta.label}
                  </p>
                  <Badge
                    className="rounded-md px-1.5 tabular-nums"
                    variant={meta.badgeVariant}
                  >
                    {grouped[severity].length}
                  </Badge>
                </div>
                {!grouped[severity].length ? (
                  <p className="notification-empty">No notifications.</p>
                ) : (
                  grouped[severity].map((item) => {
                    const actionUrl =
                      (
                        item.data as {
                          actionUrl?: string;
                        } | null
                      )?.actionUrl ?? null;
                    return (
                      <button
                        className={cn(
                          "notification-item block text-sm",
                          !item.readAt && "notification-item--unread",
                        )}
                        key={item.id}
                        onClick={() => {
                          markRead.mutate({
                            notificationId: item.id,
                          });
                          if (actionUrl) {
                            window.location.href = actionUrl;
                          }
                        }}
                        type="button"
                      >
                        <p className="font-semibold text-foreground">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {item.body}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
