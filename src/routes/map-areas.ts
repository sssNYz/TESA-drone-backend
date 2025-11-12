// src/routes/map-areas.ts
import type { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import type { Area, AreaKind, Prisma } from "@prisma/client";
import { AreaKind as PrismaAreaKind } from "@prisma/client";
import { createArea, deleteAreaById, listAreas } from "../services/areas.js";
import { areaIdParamSchema, createAreaSchema } from "../schemas/area.js";
import type { CreateAreaInput, AreaPoint } from "../schemas/area.js";

const areaPointJsonSchema = {
  type: "object",
  required: ["lat", "lon"],
  additionalProperties: false,
  properties: {
    lat: { type: "number", minimum: -90, maximum: 90 },
    lon: { type: "number", minimum: -180, maximum: 180 },
  },
};

const createAreaBodyJsonSchema = {
  type: "object",
  required: ["name", "points"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 120 },
    points: {
      type: "array",
      minItems: 3,
      items: areaPointJsonSchema,
    },
  },
};

const areaResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    kind: { type: "string", enum: ["FRIENDLY", "ANAMY"] },
    points: {
      type: "array",
      items: areaPointJsonSchema,
    },
    createdAt: { type: "string", format: "date-time" },
  },
};

const listResponseSchema = {
  type: "array",
  items: areaResponseSchema,
};

const errorResponseSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    error: { type: "string" },
    issues: { anyOf: [{ type: "object" }, { type: "array" }] },
  },
};

export default async function mapAreaRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post("/map/create-are/area/name", {
    schema: {
      tags: ["Areas"],
      summary: "Create a friendly (own-side) area polygon.",
      body: createAreaBodyJsonSchema,
      response: {
        201: areaResponseSchema,
        400: errorResponseSchema,
      },
    },
  }, makeCreateHandler(PrismaAreaKind.FRIENDLY));

  app.post("/map/create-are-anamy/area/name", {
    schema: {
      tags: ["Areas"],
      summary: "Create an anamy (opponent) area polygon.",
      body: createAreaBodyJsonSchema,
      response: {
        201: areaResponseSchema,
        400: errorResponseSchema,
      },
    },
  }, makeCreateHandler(PrismaAreaKind.ANAMY));

  app.get("/map/areas", {
    schema: {
      tags: ["Areas"],
      summary: "List all friendly areas.",
      response: {
        200: listResponseSchema,
      },
    },
  }, makeListHandler(PrismaAreaKind.FRIENDLY));

  app.get("/map/areas/anamy", {
    schema: {
      tags: ["Areas"],
      summary: "List all anamy areas.",
      response: {
        200: listResponseSchema,
      },
    },
  }, makeListHandler(PrismaAreaKind.ANAMY));

  app.delete("/map/areas/:id", {
    schema: {
      tags: ["Areas"],
      summary: "Delete a friendly area by id.",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        204: { type: "null" },
        400: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
  }, makeDeleteHandler(PrismaAreaKind.FRIENDLY));

  app.delete("/map/areas/anamy/:id", {
    schema: {
      tags: ["Areas"],
      summary: "Delete an anamy area by id.",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        204: { type: "null" },
        400: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
  }, makeDeleteHandler(PrismaAreaKind.ANAMY));
}

function makeCreateHandler(kind: AreaKind) {
  return async function createHandler(
    req: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply,
  ) {
    const parsed = createAreaSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid request body",
        issues: parsed.error.flatten(),
      });
    }

    const area = await createArea({
      ...parsed.data,
      kind,
    });

    return reply.status(201).send(serializeArea(area));
  };
}

function makeListHandler(kind: AreaKind) {
  return async function listHandler(
    _req: FastifyRequest,
    reply: FastifyReply,
  ) {
    const areas = await listAreas(kind);
    return reply.send(areas.map(serializeArea));
  };
}

function makeDeleteHandler(kind: AreaKind) {
  return async function deleteHandler(
    req: FastifyRequest<{ Params: { id?: string } }>,
    reply: FastifyReply,
  ) {
    const parsed = areaIdParamSchema.safeParse(req.params ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid path parameter",
        issues: parsed.error.flatten(),
      });
    }

    const deleted = await deleteAreaById(parsed.data.id, kind);
    if (!deleted) {
      return reply.status(404).send({
        error: "Area not found",
      });
    }

    return reply.status(204).send();
  };
}

function serializeArea(area: Area) {
  return {
    id: area.id,
    name: area.name,
    kind: area.kind,
    points: extractPoints(area.points),
    createdAt: area.createdAt.toISOString(),
  };
}

function extractPoints(points: Prisma.JsonValue): AreaPoint[] {
  if (!Array.isArray(points)) return [];
  return points
    .map((point) => {
      if (!point || typeof point !== "object") return null;
      const lat = Number((point as any).lat);
      const lon = Number((point as any).lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    })
    .filter((item): item is AreaPoint => Boolean(item));
}
