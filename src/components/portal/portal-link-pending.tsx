"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Shown when signed in but no merchant profile is linked yet. */
export function PortalLinkPending() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Merchant access not set up</CardTitle>
          <CardDescription>
            Your sign-in worked, but this account is not linked to a merchant
            profile. Use the temporary password from your invitation email, or
            ask your 3PL to resend the invite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

