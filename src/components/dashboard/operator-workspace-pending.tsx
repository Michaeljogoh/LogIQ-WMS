import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Shown when the operator is signed in but has not linked a 3PL workspace yet. */
export function OperatorWorkspacePending() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Complete your workspace</CardTitle>
          <CardDescription>
            Your account is ready. Run the setup wizard to add a warehouse,
            invite your team, and onboard merchants — or ask an administrator to
            add you to an existing workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/onboarding">Open setup wizard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings/security">Security settings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
