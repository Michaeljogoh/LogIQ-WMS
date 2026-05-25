"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTRPC } from "@/app/trpc/client";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function NotificationDrawer({ trigger }: { trigger: ReactNode }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const accountId = (session.data?.user as { accountId?: string | null } | undefined)
    ?.accountId;

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

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Unread: {notifications.data?.unreadCount ?? 0}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={
              markRead.isPending || !(notifications.data?.unreadCount ?? 0)
            }
            onClick={() => markRead.mutate({ markAll: true })}
          >
            Mark all read
          </Button>
        </div>
        <div className="mt-4 space-y-4">
          {(["CRITICAL", "WARNING", "INFO"] as const).map((severity) => (
            <div key={severity} className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                  {severity}
                </p>
                <Badge
                  variant={
                    severity === "CRITICAL" ? "destructive" : "secondary"
                  }
                >
                  {grouped[severity].length}
                </Badge>
              </div>
              {!grouped[severity].length ? (
                <p className="text-xs text-muted-foreground">
                  No notifications.
                </p>
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
                      key={item.id}
                      type="button"
                      className={`block w-full rounded-md border p-3 text-left text-sm ${!item.readAt ? "bg-muted/30" : ""}`}
                      onClick={() => {
                        markRead.mutate({
                          notificationId: item.id,
                        });
                        if (actionUrl) {
                          window.location.href = actionUrl;
                        }
                      }}
                    >
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.body}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
