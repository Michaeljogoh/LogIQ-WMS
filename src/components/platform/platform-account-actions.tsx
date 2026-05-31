"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PlatformOpenAccountButton({
  accountId: _accountId,
  accountName: _accountName,
  label = "Support access",
}: Readonly<{
  accountId: string;
  accountName: string;
  label?: string;
}>) {
  return (
    <Button asChild size="sm" type="button" variant="outline">
      <Link href="/platform/support">{label}</Link>
    </Button>
  );
}

export function PlatformClearAccountButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      disabled={loading}
      variant="outline"
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/platform/support-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "end" }),
          });
          if (!res.ok) {
            throw new Error("Could not end session");
          }
          toast.success("Support session ended");
          router.push("/platform/support");
          router.refresh();
        } catch {
          toast.error("Could not end support session");
        } finally {
          setLoading(false);
        }
      }}
      type="button"
    >
      {loading ? "…" : "Exit support session"}
    </Button>
  );
}
