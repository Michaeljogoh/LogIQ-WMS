"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Link2, Plug } from "lucide-react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import {
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  if (normalized === "TIKTOK-SHOP") return "TIKTOK_SHOP";
  return normalized.replace("-", "_");
}

function formatPlatform(platform: string) {
  return platform
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Page() {
  const trpc = useTRPC();
  const router = useRouter();
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
  const [shopDomain, setShopDomain] = useState(searchParams.get("shop") ?? "");
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");

  const trimmedShopDomain = shopDomain.trim();
  const oauthUrlQuery = useQuery({
    ...trpc.integration.getOAuthUrl.queryOptions({
      type: integrationType,
      shopDomain:
        integrationType === "SHOPIFY" ? trimmedShopDomain : undefined,
    }),
    enabled:
      integrationType !== "SHOPIFY" || trimmedShopDomain.length > 0,
  });
  const handleCallback = useMutation({
    ...trpc.integration.handleCallback.mutationOptions(),
    onSuccess: () => {
      toast.success(`${formatPlatform(platform)} connected successfully`);
      router.push("/portal/settings/integrations");
    },
    onError: (error) => {
      toast.error(error.message ?? "Could not complete connection");
    },
  });

  const isConnected = handleCallback.isSuccess;

  const isSupported = supportedPlatforms.includes(
    platform as (typeof supportedPlatforms)[number],
  );

  const canCompleteShopify =
    integrationType !== "SHOPIFY" ||
    (manualCode.trim().length > 0 && trimmedShopDomain.length > 0);

  return (
    <SettingsPage>
      <PageHeader
        description="Authorize LogIQ to import orders from your marketplace."
        title={`Connect ${formatPlatform(platform)}`}
      />

      {!isSupported ? (
        <p className="text-sm text-destructive">
          Unsupported platform. Use one of: {supportedPlatforms.join(", ")}.
        </p>
      ) : (
        <SettingsPanel>
          <SettingsPanelHeader
            description={
              integrationType === "SHOPIFY"
                ? "Enter your Shopify store domain, approve access, then finish the connection."
                : "Open the provider consent page, then paste the callback code to finish setup."
            }
            icon={Plug}
            title="OAuth connection"
          />
          <SettingsPanelBody className="space-y-4">
            {integrationType === "SHOPIFY" ? (
              <div className="space-y-2">
                <Label htmlFor="shop-domain">Shopify store domain</Label>
                <Input
                  id="shop-domain"
                  onChange={(event) => setShopDomain(event.target.value)}
                  placeholder="your-store.myshopify.com"
                  value={shopDomain}
                />
                <p className="text-xs text-muted-foreground">
                  Example: logiq-test-store-3tcw44dj.myshopify.com
                </p>
              </div>
            ) : null}

            {oauthUrlQuery.data?.authUrl ? (
              <Button asChild className="w-fit" variant="outline">
                <a
                  href={oauthUrlQuery.data.authUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="size-4" aria-hidden />
                  Open OAuth consent
                </a>
              </Button>
            ) : integrationType === "SHOPIFY" && !trimmedShopDomain ? (
              <p className="text-sm text-muted-foreground">
                Enter your store domain above to generate the OAuth link.
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="callback-code">Callback code</Label>
              <Input
                id="callback-code"
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Paste callback code from provider"
                value={manualCode}
              />
            </div>

            {integrationType === "WOOCOMMERCE" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="store-url">Store URL</Label>
                  <Input
                    id="store-url"
                    onChange={(event) => setStoreUrl(event.target.value)}
                    placeholder="https://your-store.com"
                    value={storeUrl}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consumer-key">Consumer key</Label>
                  <Input
                    id="consumer-key"
                    onChange={(event) => setConsumerKey(event.target.value)}
                    value={consumerKey}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consumer-secret">Consumer secret</Label>
                  <Input
                    id="consumer-secret"
                    onChange={(event) => setConsumerSecret(event.target.value)}
                    type="password"
                    value={consumerSecret}
                  />
                </div>
              </div>
            ) : null}

            <Button
              className="min-h-11"
              disabled={
                isConnected ||
                handleCallback.isPending ||
                (integrationType === "WOOCOMMERCE"
                  ? !manualCode.trim() ||
                    !storeUrl.trim() ||
                    !consumerKey.trim() ||
                    !consumerSecret.trim()
                  : !canCompleteShopify)
              }
              onClick={() =>
                handleCallback.mutate({
                  type: integrationType,
                  code: manualCode.trim(),
                  ...(integrationType === "SHOPIFY"
                    ? { shopDomain: trimmedShopDomain }
                    : {}),
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
              type="button"
            >
              <Link2 className="size-4" aria-hidden />
              {isConnected
                ? "Connected"
                : handleCallback.isPending
                  ? "Connecting…"
                  : "Complete connection"}
            </Button>
          </SettingsPanelBody>
        </SettingsPanel>
      )}
    </SettingsPage>
  );
}
