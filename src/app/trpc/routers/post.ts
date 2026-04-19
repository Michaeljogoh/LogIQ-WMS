import { baseProcedure, createTRPCRouter } from "../init";

export const postRouter = createTRPCRouter({
  list: baseProcedure.query(() => {
    return [{ id: "1", title: "Hello from tRPC" }];
  }),
});
