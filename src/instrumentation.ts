export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("./db/migrate");
    await runMigrations();
    const { startWorker } = await import("./lib/queue/worker");
    startWorker();
  }
}
