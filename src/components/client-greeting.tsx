"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/app/trpc/client";

export function ClientGreeting() {
  const trpc = useTRPC();
  const greeting = useQuery(trpc.hello.queryOptions({ text: "world" }));

  if (!greeting.data) {
    return <p className="text-muted-foreground">Loading greeting…</p>;
  }

  return <p>{greeting.data.greeting}</p>;
}
