// src/services/raw.ts
import { prisma } from "../db/prisma.js";

export async function saveRaw(topic: string, payload: string, opts?: {parseOk?: boolean, error?: string}) {
  const rec = await prisma.rawMessage.create({
    data: { topic, payload, parseOk: !!opts?.parseOk, error: opts?.error ?? null },
    select: { id: true }
  });
  return rec.id;
}

export async function getRawById(id: bigint | string) {
  return prisma.rawMessage.findUnique({ where: { id: BigInt(id) } });
}