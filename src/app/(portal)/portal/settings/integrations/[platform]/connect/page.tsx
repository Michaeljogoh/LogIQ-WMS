"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const supportedPlatforms = [
  "shopify",
  "woocommerce",
  "bigcommerce",
  "etsy",
  "tiktok_shop",
  "ebay",
] as const;

function toIntegrationType(platform: string) {
  const normalized = platform.toUpperCase();
  if (normalized === "TIKTOK-SHOP") {
    return "TIKTOK_SHOP";
  }
  return normalized.replace("-", "_");
}

export default function Page() {
  const trpc = useTRPC();
  const params = useParams<{ platform: string }>();
  const searchParams = useSearchParams();
  const platform = params.platform;
  const integrationType = toIntegrationType(platform) as
    | "SHOPIFY"
    | "WOOCOMMERCE"
    | "BIGCOMMERCE"
    | "ETSY"
    | "TIKTOK_SHOP"
    | "EBAY";
  const [manualCode, setManualCode] = useState(searchParams.get("code") ?? "");
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const oauthUrlQuery = useQuery(
    trpc.integration.getOAuthUrl.queryOptions({ type: integrationType }),
  );
  const handleCallback = useMutation(
    trpc.integration.handleCallback.mutationOptions(),
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Connect {platform}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Start OAuth by opening the provider consent page.
          </p>
          <a
            href={oauthUrlQuery.data?.authUrl}
            className="text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Open OAuth consent
          </a>
          <Input
            placeholder="Paste callback code"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
          />
          <Button
            disabled={
              handleCallback.isPending ||
              (integrationType === "WOOCOMMERCE"
                ? !manualCode.trim() ||
                  !storeUrl.trim() ||
                  !consumerKey.trim() ||
                  !consumerSecret.trim()
                : !manualCode.trim())
            }
            onClick={() =>
              handleCallback.mutate({
                type: integrationType,
                code: manualCode.trim(),
                manualCredentials:
                  integrationType === "WOOCOMMERCE"
                    ? {
                        storeUrl: storeUrl.trim(),
                        consumerKey: consumerKey.trim(),
                        consumerSecret: consumerSecret.trim(),
                      }
                    : undefined,
              })
            }
          >
            Complete connection
          </Button>
          {integrationType === "WOOCOMMERCE" ? (
            <div className="space-y-2">
              <Input
                placeholder="Store URL"
                value={storeUrl}
                onChange={(event) => setStoreUrl(event.target.value)}
              />
              <Input
                placeholder="Consumer key"
                value={consumerKey}
                onChange={(event) => setConsumerKey(event.target.value)}
              />
              <Input
                placeholder="Consumer secret"
                value={consumerSecret}
                onChange={(event) => setConsumerSecret(event.target.value)}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
      {!supportedPlatforms.includes(
        platform as (typeof supportedPlatforms)[number],
      ) ? (
        <p className="px-6 text-sm text-destructive">
          Unsupported platform route. Use one of:{" "}
          {supportedPlatforms.join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
