export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensurePlatformAdminSeed } = await import(
      "@/server/seed/platform-admin"
    );
    await ensurePlatformAdminSeed();
  }
}
