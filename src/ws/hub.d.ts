import type { FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
export declare function registerClient(socket: WebSocket, req: FastifyRequest): void;
export declare function broadcast(payload: unknown): void;
//# sourceMappingURL=hub.d.ts.map