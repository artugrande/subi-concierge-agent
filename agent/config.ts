/**
 * SUBI Concierge Agent Configuration
 * 
 * Placeholder values for hackathon submission
 * To be configured by deployer with real values
 */

export const AGENT_CONFIG = {
  // ERC-8004 Agent ID - TO BE ASSIGNED
  // See: https://eips.ethereum.org/EIPS/eip-8004
  AGENT_ID: "PLACEHOLDER_AGENT_ID",
  
  // Agent wallet address - TO BE CONFIGURED
  AGENT_WALLET: "PLACEHOLDER_AGENT_WALLET_ADDRESS",
  
  // Celo attribution tag for value moved tracking
  // Format: celo_<project>_<action>
  ATTRIBUTION_TAG: "PLACEHOLDER_CELO_ATTRIBUTION_TAG",
  
  // Contract addresses (populated after deployment)
  CONTRACTS: {
    CELO_MAINNET: {
      treasury: "",
      registry: "",
      distributor: "",
      pledgeRegistry: "",
      asset: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // cUSD
    },
    CELO_SEPOLIA: {
      treasury: "",
      registry: "",
      distributor: "",
      pledgeRegistry: "",
      asset: "", // Mock USDC deployed in tests
    },
  },
  
  // RPC endpoints
  RPC: {
    CELO_MAINNET: "https://forno.celo.org",
    CELO_SEPOLIA: "https://alfajores-forno.celo-testnet.org",
  },
};

/**
 * Update configuration after deployment
 */
export function updateConfig(
  network: "CELO_MAINNET" | "CELO_SEPOLIA",
  contracts: {
    treasury: string;
    registry: string;
    distributor: string;
    pledgeRegistry: string;
    asset?: string;
  }
) {
  AGENT_CONFIG.CONTRACTS[network] = {
    ...AGENT_CONFIG.CONTRACTS[network],
    ...contracts,
  };
}
