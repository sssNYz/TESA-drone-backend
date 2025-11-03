// src/server.ts
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type { FastifyRequest } from "fastify";
import "./mqtt/ingest.js";          // start ingest
import healthRoutes from "./routes/health.js";
import droneRoutes from "./routes/drone.js";
import adminRoutes from "./routes/admin.js";
import { registerClient } from "./ws/hub.js";

const server = Fastify();

async function start() {
  await server.register(websocket);

  server.get("/ws", { websocket: true }, (conn, _req: FastifyRequest) => {
    console.log("🔌 New WebSocket connection");
    registerClient(conn);
    conn.send(JSON.stringify({ type: "hello", ok: true }));
  });

  server.register(healthRoutes);
  server.register(droneRoutes);
  server.register(adminRoutes);

  const port = Number(process.env.PORT) || 3000;
  server.listen({ port, host: "0.0.0.0" }, (err, address) =>  {
    if (err) { console.error(err); process.exit(1); }
    console.log(`🚀 Server ready at ${address}`);
  });
}
start();