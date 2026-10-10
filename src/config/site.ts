export const SITE = {
  name: "Tredie",
  domain: "tredi.life",
  tagline: "Your transactions, alive.",
  description:
    "Every Stellar transaction becomes a unique little creature. Pay, and something is born.",
} as const;

export const STELLAR_NETWORK_LABEL =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "public" ? "Stellar Public" : "Stellar Testnet";

export const IS_TESTNET = process.env.NEXT_PUBLIC_STELLAR_NETWORK !== "public";

export const ASSET_CODE = process.env.NEXT_PUBLIC_STELLAR_ASSET_CODE ?? "USDC";

/** Maximum upload size the image provider is asked for. */
export const IMAGE_SIZE = process.env.NEXT_PUBLIC_IMAGE_SIZE ?? "1024x1024";