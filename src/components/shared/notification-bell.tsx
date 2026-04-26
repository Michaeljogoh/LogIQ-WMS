"use client";

import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Notifications"
    >
      <BellIcon className="size-5" />
    </Button>
  );
}
