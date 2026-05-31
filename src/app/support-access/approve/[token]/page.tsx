"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SupportAccessApprovePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [pending, setPending] = useState<"approve" | "deny" | null>(null);

  async function submit(decision: "approve" | "deny") {
    setPending(decision);
    try {
      const res = await fetch("/api/support-access/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, decision }),
      });
      const data = (await res.json()) as {
        error?: string;
        accountName?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }
      if (decision === "approve") {
        toast.success(
          `Emergency access approved for ${data.accountName ?? "your account"}.`,
        );
      } else {
        toast.success("Emergency access request denied.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Emergency support access</CardTitle>
          <CardDescription>
            A LogIQ platform administrator requested temporary impersonation
            access to your operator workspace. Only account owners can approve
            or deny.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            disabled={pending !== null}
            onClick={() => void submit("approve")}
            type="button"
          >
            {pending === "approve" ? "Approving…" : "Approve access"}
          </Button>
          <Button
            disabled={pending !== null}
            onClick={() => void submit("deny")}
            type="button"
            variant="destructive"
          >
            {pending === "deny" ? "Denying…" : "Deny request"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
