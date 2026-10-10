import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Storage } from "@google-cloud/storage";

/**
 * Dormant. Nothing uploads generated images any more, because portraits are
 * composed in the UI from static assets in `public/tredie`. Kept for the same
 * reason as `src/services/generation`: the storage boundary should not have to
 * be rebuilt if flattened or AI portraits return.
 */

const BUCKET = process.env.GCS_BUCKET ?? "";

export const storageMode: "gcs" | "local" = BUCKET ? "gcs" : "local";

function getStorage(): Storage {
  return new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || undefined,
    ...(process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY
      ? {
          credentials: {
            client_email: process.env.GCS_CLIENT_EMAIL,
            private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, "\n"),
          },
        }
      : {}),
  });
}

function publicUrl(objectName: string): string {
  const base =
    process.env.GCS_PUBLIC_BASE_URL ??
    `https://storage.googleapis.com/${BUCKET}`;
  return `${base.replace(/\/$/, "")}/${objectName}`;
}

export async function storeGeneratedImage(input: {
  tredieId: string;
  extension: string;
  contentType: string;
  data: Buffer;
}): Promise<string> {
  const objectName = `tredies/${input.tredieId}.${input.extension}`;

  if (storageMode === "gcs") {
    const file = getStorage().bucket(BUCKET).file(objectName);
    await file.save(input.data, {
      contentType: input.contentType,
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    return publicUrl(objectName);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "GCS_BUCKET must be set in production. The container filesystem is read-only, so images cannot be written to ./public/generated.",
    );
  }

  const target = path.join(process.cwd(), "public", "generated", `${input.tredieId}.${input.extension}`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, input.data);
  return `/generated/${input.tredieId}.${input.extension}`;
}