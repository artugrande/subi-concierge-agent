import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { AGENT_CONFIG } from "./config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    celo: {
      url: AGENT_CONFIG.CELO_RPC_URL,
      chainId: 42220,
      accounts: AGENT_CONFIG.DEPLOYER_PRIVATE_KEY 
        ? [AGENT_CONFIG.DEPLOYER_PRIVATE_KEY]
        : [],
    },
    // Alfajores fue dado de baja: el testnet de Celo es Celo Sepolia.
    "celo-sepolia": {
      url: AGENT_CONFIG.CELO_SEPOLIA_RPC_URL,
      chainId: 11142220,
      accounts: AGENT_CONFIG.DEPLOYER_PRIVATE_KEY
        ? [AGENT_CONFIG.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
