import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function toErrorResponse(error: unknown, fallbackStatus = 500) {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return jsonError(first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", 422);
  }
  const status =
    typeof error === "object" && error !== null && "statusCode" in error
      ? Number((error as { statusCode: unknown }).statusCode)
      : fallbackStatus;
  const message =
    error instanceof Error ? error.message : "Something went wrong. Try again.";
  if (status >= 500) console.error("[tredie]", error);
  return jsonError(message, Number.isFinite(status) ? status : fallbackStatus);
}