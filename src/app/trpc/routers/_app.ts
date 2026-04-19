import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { postRouter } from "./post";

export const appRouter = createTRPCRouter({
  post: postRouter,
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query((opts) => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),
});

export type AppRouter = typeof appRouter;
