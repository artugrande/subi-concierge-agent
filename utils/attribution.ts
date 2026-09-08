import { toDataSuffix } from "@celo/attribution-tags";
import { AGENT_CONFIG } from "../config";

/**
 * Appends the Celo attribution tag to transaction data.
 * 
 * CRITICAL: Every transaction on Celo mainnet MUST include this tag
 * to receive hackathon credit. Missing the tag on a tx permanently loses credit.
 * 
 * @param data - The transaction data (can be '0x' for simple transfers or contract call data)
 * @returns The data with attribution tag appended
 */
export function withAttribution(data: string = "0x"): string {
  const suffix = toDataSuffix(AGENT_CONFIG.ATTRIBUTION_TAG);
  
  // If data is just '0x', append the suffix
  if (data === "0x" || data === "") {
    return "0x" + suffix;
  }
  
  // Remove '0x' prefix if present, append suffix, add back '0x'
  const dataWithoutPrefix = data.startsWith("0x") ? data.slice(2) : data;
  return "0x" + dataWithoutPrefix + suffix;
}

/**
 * Adds attribution to a transaction object.
 * Works with both contract creation and contract calls.
 * 
 * @param tx - Transaction object with optional 'data' field
 * @returns Transaction object with attribution tag in data field
 */
export function addAttributionToTx<T extends { data?: string }>(tx: T): T {
  return {
    ...tx,
    data: withAttribution(tx.data),
  };
}

/**
 * Get the attribution tag and agent ID for reference
 */
export function getAttributionInfo() {
  return {
    tag: AGENT_CONFIG.ATTRIBUTION_TAG,
    agentId: AGENT_CONFIG.AGENT_ID,
    agentWallet: AGENT_CONFIG.AGENT_WALLET_ADDRESS,
  };
}
