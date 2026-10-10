import type { CreatureAttributeRecord } from "@/types";
import { renderCreatureSvg } from "./placeholder";

/**
 * Dormant. Tredie no longer renders portraits with an image model: a Tredie is a
 * fixed species asset plus an accessory, composed in the UI from
 * `src/config/portraits.ts`. These providers are kept so the boundary described
 * in AGENTS.md still exists if AI portraits are ever reintroduced.
 */

export interface GenerateInput {
  prompt: string;
  negativePrompt: string;
  attributes: CreatureAttributeRecord;
}

export interface GenerateResult {
  data: Buffer;
  contentType: string;
  extension: string;
  providerId: string;
  providerLabel: string;
  /** True when the image is a locally rendered study rather than an AI generation. */
  preview: boolean;
}

export interface GenerationProvider {
  id: string;
  label: string;
  isConfigured(): boolean;
  generate(input: GenerateInput): Promise<GenerateResult>;
}

export class GenerationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 502,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

function decodeBase64(value: string): Buffer {
  return Buffer.from(value, "base64");
}

/**
 * OpenAI image generation.
 *
 * `gpt-image-1` has no separate negative prompt field, so the negative list is
 * folded into the end of the prompt text. The prompt itself is unchanged: the
 * model still only renders attributes the application selected.
 */
const openaiProvider: GenerationProvider = {
  id: "openai",
  label: "OpenAI gpt-image-1",
  isConfigured: () => Boolean(process.env.OPENAI_API_KEY ?? process.env.IMAGE_GENERATION_API_KEY),
  async generate(input) {
    const apiKey = process.env.OPENAI_API_KEY ?? process.env.IMAGE_GENERATION_API_KEY;
    if (!apiKey) throw new GenerationError("OpenAI is not configured.", 500);

    const prompt = `${input.prompt}\n\nStrictly avoid: ${input.negativePrompt}.`;

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.IMAGE_GENERATION_MODEL ?? "gpt-image-1",
        prompt,
        size: process.env.IMAGE_GENERATION_SIZE ?? "1024x1024",
        n: 1,
      }),
    });

    if (!response.ok) {
      throw new GenerationError(
        `OpenAI image generation failed (${response.status}): ${await response.text()}`,
      );
    }

    const payload = (await response.json()) as { data?: { b64_json?: string }[] };
    const b64 = payload.data?.[0]?.b64_json;
    if (!b64) throw new GenerationError("OpenAI returned no image data.");

    return {
      data: decodeBase64(b64),
      contentType: "image/png",
      extension: "png",
      providerId: "openai",
      providerLabel: "OpenAI gpt-image-1",
      preview: false,
    };
  },
};

const googleProvider: GenerationProvider = {
  id: "google",
  label: "Google Gemini image",
  isConfigured: () => Boolean(process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY),
  async generate(input) {
    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
    if (!apiKey) throw new GenerationError("Google image generation is not configured.", 500);

    const model = process.env.IMAGE_GENERATION_MODEL ?? "gemini-2.5-flash-image";
    const prompt = `${input.prompt}\n\nStrictly avoid: ${input.negativePrompt}.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      },
    );

    if (!response.ok) {
      throw new GenerationError(
        `Google image generation failed (${response.status}): ${await response.text()}`,
      );
    }

    const payload = (await response.json()) as {
      candidates?: {
        content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] };
      }[];
    };

    const parts = payload.candidates?.[0]?.content?.parts ?? [];
    const image = parts.find((part) => part.inlineData?.data);
    if (!image?.inlineData?.data) {
      throw new GenerationError("Google returned no image data.");
    }

    const mimeType = image.inlineData.mimeType ?? "image/png";
    return {
      data: decodeBase64(image.inlineData.data),
      contentType: mimeType,
      extension: mimeType.includes("jpeg") ? "jpg" : "png",
      providerId: "google",
      providerLabel: "Google Gemini image",
      preview: false,
    };
  },
};

/**
 * Local deterministic renderer. Always available, never pretends to be AI, and
 * produces exactly the same study for the same attributes.
 */
const placeholderProvider: GenerationProvider = {
  id: "preview",
  label: "Preview render",
  isConfigured: () => true,
  async generate(input) {
    const svg = renderCreatureSvg(input.attributes);
    return {
      data: Buffer.from(svg, "utf8"),
      contentType: "image/svg+xml",
      extension: "svg",
      providerId: "preview",
      providerLabel: "Preview render",
      preview: true,
    };
  },
};

export const GENERATION_PROVIDERS: readonly GenerationProvider[] = [
  openaiProvider,
  googleProvider,
  placeholderProvider,
];

export function resolveGenerationProvider(preferred?: string): GenerationProvider {
  const ordered = preferred
    ? [
        ...GENERATION_PROVIDERS.filter((provider) => provider.id === preferred),
        ...GENERATION_PROVIDERS.filter((provider) => provider.id !== preferred),
      ]
    : GENERATION_PROVIDERS;

  return ordered.find((provider) => provider.isConfigured()) ?? placeholderProvider;
}

export function generationStatus() {
  return {
    active: resolveGenerationProvider().id,
    providers: GENERATION_PROVIDERS.map((provider) => ({
      id: provider.id,
      label: provider.label,
      configured: provider.isConfigured(),
    })),
  };
}