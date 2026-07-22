import { createNetcodeServer } from "./NetcodeServer.js";

const port = Number.parseInt(process.env.PORT ?? "8090", 10);
const heartbeatTimeoutMs = Number.parseInt(process.env.HEARTBEAT_TIMEOUT_MS ?? "15000", 10);
const heartbeatSweepMs = Number.parseInt(process.env.HEARTBEAT_SWEEP_MS ?? "1000", 10);
const server = createNetcodeServer({
  port: Number.isFinite(port) ? port : 8090,
  host: process.env.HOST,
  heartbeatTimeoutMs: Number.isFinite(heartbeatTimeoutMs) ? heartbeatTimeoutMs : 15_000,
  heartbeatSweepMs: Number.isFinite(heartbeatSweepMs) ? heartbeatSweepMs : 1_000
});

server
  .start()
  .then((listeningPort) => {
    console.log(`SuperCube netcode server listening on port ${listeningPort}`);
  })
  .catch((error) => {
    console.error("Failed to start SuperCube netcode server:", error);
    process.exitCode = 1;
  });

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down SuperCube netcode server.`);
  try {
    await server.stop();
    process.exit(0);
  } catch (error) {
    console.error("Failed to stop SuperCube netcode server cleanly:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
