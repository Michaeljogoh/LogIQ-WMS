import "server-only";

import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { cache } from "react";
import { appRouter } from "@/server/api/root";
import { createTRPCContextFromHeaders } from "@/server/api/trpc";
import { makeQueryClient } from "./query-client";

export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy({
  ctx: async () => createTRPCContextFromHeaders(await headers()),
  router: appRouter,
  queryClient: getQueryClient,
});
