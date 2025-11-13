// src/server.ts
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyRequest } from "fastify";
import "./mqtt/ingest.js";          // start ingest
import "./mqtt/drone-state-consumer.js"; // start fake drone consumer
import healthRoutes from "./routes/health.js";
import droneRoutes from "./routes/drone.js";
import adminRoutes from "./routes/admin.js";
import apiDronesRoutes from "./routes/api-drones.js";
import offensiveTripRoutes from "./routes/offensive-trips.js";
import mapAreaRoutes from "./routes/map-areas.js";
import wsDroneRoutes from "./routes/ws-drone.js";
import { registerClient } from "./ws/hub.js";

const server = Fastify();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST ?? "0.0.0.0";
const swaggerServers = process.env.PUBLIC_SERVER_URL
  ? [{ url: process.env.PUBLIC_SERVER_URL }]
  : [{ url: "/" }];

async function start() {
  await server.register(swagger, {
    openapi: {
      info: {
        title: "TESA Drone Backend",
        description: "Fastify API powering the drone ingest and monitoring stack.",
        version: "1.0.0",
      },
      servers: swaggerServers,
      tags: [
        { name: "Health", description: "Service readiness and diagnostics." },
        { name: "Drones", description: "Telemetry, history, and command endpoints." },
        { name: "Admin", description: "Maintenance helpers for operators." },
        { name: "Areas", description: "Manual map polygons for own-side and anamy zones." },
        { name: "OFFENSIVE", description: "Trip planning and movement commands." },
        { name: "WS-Drone", description: "Frames, images, and telemetry ingested via WebSocket." },
      ],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  await server.register(websocket, {
    options: {
      maxPayload: 15 * 1024 * 1024,
    },
  });

  server.get("/ws", { websocket: true }, (conn, req: FastifyRequest) => {
    const socket = "socket" in conn ? (conn as any).socket : undefined;
    registerClient(socket ?? (conn as any), req);
  });

  server.register(healthRoutes);
  server.register(droneRoutes);
  server.register(adminRoutes);
  server.register(apiDronesRoutes);
  server.register(offensiveTripRoutes);
  server.register(wsDroneRoutes);
  server.register(mapAreaRoutes);

  server.listen({ port, host }, (err, address) =>  {
    if (err) { console.error(err); process.exit(1); }
    console.log(`🚀 Server ready at ${address}`);
    console.log(`📘 Swagger UI ready at ${address}/docs`);
  });
}
start();
