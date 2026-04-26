"use client";

import {
  customSessionClient,
  genericOAuthClient,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "");

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    organizationClient(),
    magicLinkClient(),
    genericOAuthClient(),
    customSessionClient(),
  ],
});
