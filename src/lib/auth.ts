/**
 * better-auth server instance — implement in Module 2 (Authentication & Multi-Tenancy).
 * The temporary shape below keeps tRPC context initialization safe until auth is wired.
 */
export const auth = {
  api: {
    async getSession(_opts: { headers: Headers }) {
      return null;
    },
  },
};
