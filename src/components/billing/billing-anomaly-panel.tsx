"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Flag = {
  severity?: string;
  type?: string;
  description?: string;
  expectedValue?: string;
  actualValue?: string;
  lineId?: string;
  source?: string;
};

function normalizeFlags(raw: unknown): Flag[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return [];
  }
  const o = raw as Record<string, unknown>;
  const deterministic = Array.isArray(o.flags) ? (o.flags as Flag[]) : [];
  const claude = Array.isArray(o.claudeFlags) ? (o.claudeFlags as Flag[]) : [];
  return [...deterministic, ...claude];
}

export function BillingAnomalyPanel(props: { anomalyFlags: unknown }) {
  const flags = normalizeFlags(props.anomalyFlags);
  if (flags.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Billing review
          <Badge variant="secondary">{flags.length} flags</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {flags.map((flag, i) => (
            <AccordionItem key={`${flag.type ?? "flag"}-${i}`} value={`${i}`}>
              <AccordionTrigger className="text-left">
                <span className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      flag.severity === "CRITICAL"
                        ? "destructive"
                        : flag.severity === "WARNING"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {flag.severity ?? "INFO"}
                  </Badge>
                  <span className="font-medium">{flag.type ?? "Anomaly"}</span>
                  {flag.source === "claude" ? (
                    <Badge variant="outline">AI scan</Badge>
                  ) : null}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>{flag.description}</p>
                {flag.expectedValue !== undefined ? (
                  <p>
                    <span className="font-medium text-foreground">
                      Expected:{" "}
                    </span>
                    {flag.expectedValue}
                  </p>
                ) : null}
                {flag.actualValue !== undefined ? (
                  <p>
                    <span className="font-medium text-foreground">
                      Actual:{" "}
                    </span>
                    {flag.actualValue}
                  </p>
                ) : null}
                {flag.lineId ? (
                  <p className="text-xs">Line id: {flag.lineId}</p>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
