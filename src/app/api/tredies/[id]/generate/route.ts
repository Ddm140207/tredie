import { NextResponse } from "next/server";
import { jsonError, toErrorResponse } from "@/lib/api";
import { getRepository } from "@/services/persistence";
import { generateImageFor } from "@/services/tredies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Retries image generation for a Tredie that already exists.
 *
 * This endpoint deliberately has no payment path. A failed generation is retried
 * against the same confirmed transaction and the same stored attributes, so a
 * user is never charged twice and never receives a different creature.
 */

const inFlight = new Map<string, Promise<unknown>>();

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const repository = getRepository();

    const tredie = await repository.getById(id);
    if (!tredie) return jsonError("That Tredie does not exist.", 404);

    if (tredie.status === "ready" && tredie.imageUrl) {
      return NextResponse.json({ tredie });
    }

    const existing = inFlight.get(id);
    if (existing) {
      await existing.catch(() => undefined);
      const refreshed = await repository.getById(id);
      if (!refreshed) return jsonError("That Tredie does not exist.", 404);
      return NextResponse.json({ tredie: refreshed });
    }

    const task = generateImageFor(id);
    inFlight.set(id, task);
    try {
      const updated = await task;
      return NextResponse.json({ tredie: updated });
    } finally {
      inFlight.delete(id);
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}