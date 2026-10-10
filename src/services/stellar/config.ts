import { Networks } from "@stellar/stellar-sdk";

/**
 * Stellar network configuration.
 *
 * USDC issuer for Stellar **testnet** is the Circle-issued testnet trustline.
 * Confirm it against Circle / Stellar expert before a public launch and set
 * STELLAR_USDC_ISSUER in .env.local to override.
 */
export const DEFAULT_TESTNET_USDC_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

export type NetworkName = "testnet" | "public";

export interface StellarSettings {
  network: NetworkName;
  networkPassphrase: string;
  horizonUrl: string;
  rpcUrl: string;
  friendbotUrl: string;
  assetCode: string;
  assetIssuer: string;
}

export function getStellarSettings(): StellarSettings {
  const network: NetworkName =
    process.env.STELLAR_NETWORK === "public" ? "public" : "testnet";
  const assetCode = process.env.STELLAR_ASSET_CODE ?? "USDC";

  if (network === "public") {
    const issuer = process.env.STELLAR_USDC_ISSUER;
    if (!issuer) {
      throw new Error(
        "STELLAR_USDC_ISSUER is required when STELLAR_NETWORK=public. Tredie only ships a default issuer for testnet.",
      );
    }
    return {
      network,
      networkPassphrase: Networks.PUBLIC,
      horizonUrl: process.env.STELLAR_HORIZON_URL ?? "https://horizon.stellar.org",
      rpcUrl: process.env.STELLAR_RPC_URL ?? "https://soroban.stellar.org",
      friendbotUrl: "https://friendbot.stellar.org",
      assetCode,
      assetIssuer: issuer,
    };
  }

  const testnetCode = process.env.STELLAR_ASSET_CODE ?? "USDC";
  return {
    network,
    networkPassphrase: Networks.TESTNET,
    horizonUrl: process.env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
    rpcUrl: process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org",
    friendbotUrl: process.env.STELLAR_FRIENDBOT_URL ?? "https://friendbot.stellar.org",
    assetCode: testnetCode,
    assetIssuer:
      testnetCode === "XLM"
        ? ""
        : (process.env.STELLAR_USDC_ISSUER ?? DEFAULT_TESTNET_USDC_ISSUER),
  };
}

export function isNativeAsset(settings: StellarSettings): boolean {
  return settings.assetCode === "XLM";
}