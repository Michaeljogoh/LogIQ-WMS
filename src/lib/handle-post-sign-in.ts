"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { SessionUser } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";

export async function handlePostPasswordSignIn(params: {
  router: AppRouterInstance;
}): Promise<void> {
  const session = await authClient.getSession();
  const user = session.data?.user as SessionUser | undefined;

  if (user?.twoFactorEnabled === true) {
    return;
  }

  params.router.push(resolvePostAuthRedirect(user));
  params.router.refresh();
}
