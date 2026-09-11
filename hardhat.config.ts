import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { AGENT_CONFIG } from "./config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
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
    // Copia local de mainnet con anvil, para simular sin tocar nada real.
    // El nodo de Hardhat no puede copiar Celo: no trae su historial de hardforks.
    "celo-fork": {
      url: process.env.FORK_RPC_URL || "http://127.0.0.1:8547",
      chainId: 42220,
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
