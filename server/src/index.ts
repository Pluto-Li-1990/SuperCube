import { createNetcodeServer } from "./NetcodeServer.js";

const port = Number.parseInt(process.env.PORT ?? "8090", 10);
const server = createNetcodeServer({ port: Number.isFinite(port) ? port : 8090 });

server
  .start()
  .then((listeningPort) => {
    console.log(`SuperCube netcode server listening on ws://localhost:${listeningPort}`);
  })
  .catch((error) => {
    console.error("Failed to start SuperCube netcode server:", error);
    process.exitCode = 1;
  });

const shutdown = async () => {
  await server.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
