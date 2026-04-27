"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";

export function MerchantClaim(props: Readonly<{ merchantUserId: string }>) {
  const trpc = useTRPC();
  const attempted = useRef(false);

  const claim = useMutation(trpc.merchantUser.claim.mutationOptions());

  useEffect(() => {
    if (attempted.current) {
      return;
    }
    attempted.current = true;

    void (async () => {
      try {
        await claim.mutateAsync({ merchantUserId: props.merchantUserId });
        toast.success("Account linked");
        window.location.assign("/portal/dashboard");
      } catch {
        toast.error("Could not link invitation. Try signing in again.");
      }
    })();
  }, [claim, props.merchantUserId]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground">
      Linking your invitation…
    </div>
  );
}
