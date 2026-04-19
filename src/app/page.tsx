import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/app/trpc/server";
import { ClientGreeting } from "@/components/client-greeting";

export const dynamic = "force-dynamic";

export default async function Home() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.hello.queryOptions({ text: "world" }));

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-6 py-24 px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          tRPC + Next.js App Router
        </h1>
        {/* <HydrationBoundary state={dehydrate(queryClient)}> */}
          <ClientGreeting />
        {/* </HydrationBoundary> */}
      </main>
    </div>
  );
}
