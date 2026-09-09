/**
 * SUBI Concierge Agent Configuration
 * 
 * Placeholder values for hackathon submission
 * To be configured by deployer with real values
 */

export const AGENT_CONFIG = {
  // ERC-8004 Agent ID (Celo mainnet Identity Registry)
  // See: https://eips.ethereum.org/EIPS/eip-8004
  AGENT_ID: "9822",
  
  // Agent wallet address (funded on Celo mainnet)
  // Balance: ~1.98 USDT + ~50 CELO (fee abstraction still demoed for MiniPay UX)
  AGENT_WALLET: "0x35422f585e1f570515147E557aEF8fD6a6e1b3b3",
  
  // Celo attribution tag for value moved tracking
  // Format: celo_<project>_<action>
  // Celo Builders Agents at Work attribution tag (locked to github artugrande/subi-concierge-agent)
  ATTRIBUTION_TAG: "celo_ac17e664a585",
  
  // Contract addresses (populated after deployment)
  CONTRACTS: {
    CELO_MAINNET: {
      treasury: "0x093D55468acee5a9b11644d1E55097C4E99C2739",
      registry: "0x72Aa7f3B4ca2c230cd710Ef847015f0B963F0232",
      distributor: "0x1f945618F4bFa0e131E07FfA0335e7Ada6556279",
      pledgeRegistry: "0x642b4F2737E85f42bae5Fc4830544EBCf48F1F13",
      asset: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", // USDT (agent wallet funded with this)
      // Alternative: cUSD 0x765DE816845861e75A25fCA122bb6898B8B1282a
      // Alternative: USDC 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
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
