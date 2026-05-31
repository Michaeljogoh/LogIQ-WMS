import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PlatformDiagnosticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Diagnostics</h1>
        <p className="text-sm text-muted-foreground">
          System-level health and integration status (expand as needed).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment</CardTitle>
          <CardDescription>Runtime configuration (non-secret)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs text-muted-foreground">
          <p>NODE_ENV: {process.env.NODE_ENV}</p>
          <p>
            App URL:{" "}
            {process.env.NEXT_PUBLIC_APP_URL ??
              process.env.BETTER_AUTH_URL ??
              "—"}
          </p>
          <p>
            Postmark:{" "}
            {process.env.POSTMARK_SERVER_TOKEN ? "configured" : "not configured"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
