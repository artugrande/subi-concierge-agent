import * as dotenv from "dotenv";

dotenv.config();

/**
 * Agent configuration for SUBI Concierge Agent
 * Celo Agents at Work Hackathon entry
 */
export const AGENT_CONFIG = {
  // Celo Attribution Tag (REQUIRED for hackathon credit)
  // From Celo Builders registration - MUST be included in ALL transactions
  ATTRIBUTION_TAG: process.env.ATTRIBUTION_TAG || "celo_ac17e664a585",
  
  // ERC-8004 Agent ID
  AGENT_ID: process.env.AGENT_ID || "9822",
  
  // Agent Wallet Address
  AGENT_WALLET_ADDRESS: process.env.AGENT_WALLET_ADDRESS || "0x35422f585e1f570515147E557aEF8fD6a6e1b3b3",
  
  // Deployer Private Key (only for deployment, never commit)
  DEPLOYER_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY,
  
  // RPC URLs
  CELO_RPC_URL: process.env.CELO_RPC_URL || "https://forno.celo.org",
  CELO_SEPOLIA_RPC_URL: process.env.CELO_SEPOLIA_RPC_URL || "https://forno.celo-sepolia.celo-testnet.org",
} as const;

// Validate required configuration
export function validateConfig() {
  if (!AGENT_CONFIG.ATTRIBUTION_TAG) {
    throw new Error("ATTRIBUTION_TAG is required");
  }
  if (!AGENT_CONFIG.AGENT_ID) {
    throw new Error("AGENT_ID is required");
  }
  if (!AGENT_CONFIG.AGENT_WALLET_ADDRESS) {
    throw new Error("AGENT_WALLET_ADDRESS is required");
  }
}
