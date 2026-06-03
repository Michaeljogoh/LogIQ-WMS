"use client";

import { useQuery } from "@tanstack/react-query";
import { BellIcon } from "lucide-react";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { NotificationDrawer } from "./notification-drawer";

export function NotificationBell() {
  const trpc = useTRPC();
  const session = authClient.useSession();
  const accountId = (
    session.data?.user as { accountId?: string | null } | undefined
  )?.accountId;

  const notifications = useQuery({
    ...trpc.notifications.list.queryOptions({ limit: 10 }),
    enabled: Boolean(accountId),
  });
  const unread = notifications.data?.unreadCount ?? 0;

  return (
    <NotificationDrawer
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <BellIcon className="size-5" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      }
    />
  );
}
