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
      treasury: "0xf9b22b915C881F0565CCC7B0874f7F7032eDeb76",
      registry: "0x7eb6a75AeCcD8D90F5f9c2D46eb92ab5535e439A",
      distributor: "0x82c3273381F96027f78CcB3595b3606203e453CC",
      pledgeRegistry: "0xaa572f7F6b141B99768a5eE542967A263d2a8071",
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
