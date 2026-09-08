/**
 * SUBI Concierge Agent - Transaction Builder
 * 
 * Builds unsigned transactions for:
 * - Pledge deposits to treasury
 * - Claim dividends from distributor
 * - Register with Self proof
 * - Create pledge commitments
 * 
 * Compatible with celo-mcp style transaction building
 */

import { ethers } from "ethers";
import { AGENT_CONFIG } from "./config";

// ABI fragments for transaction building
const TREASURY_ABI = [
  "function deposit(uint256 amount, string attribution) external",
];

const DISTRIBUTOR_ABI = [
  "function claim() external returns (uint256)",
  "function claimable(address human) external view returns (uint256)",
];

const REGISTRY_ABI = [
  "function register(bytes32 nullifier) external",
  "function renew() external",
];

const PLEDGE_REGISTRY_ABI = [
  "function createPledge(string name, uint256 revenuePercentBps, uint256 annualFloorUSD, uint256 startDate, uint256 endDate, string reportURI) external returns (uint256)",
  "function submitReport(uint256 pledgeId, bytes32 reportHash, uint256 amountUSD, string reportURI) external",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
];

export interface UnsignedTransaction {
  to: string;
  data: string;
  value: string;
  chainId: number;
  attribution?: string;
}

/**
 * Build unsigned transaction for treasury deposit (pledge)
 */
export function buildPledgeTransaction(
  network: "CELO_MAINNET" | "CELO_SEPOLIA",
  amount: string, // Amount in token units (e.g., "1000000" for 1 USDC with 6 decimals)
  attribution: string // Company/mission attribution
): UnsignedTransaction[] {
  const config = AGENT_CONFIG.CONTRACTS[network];
  const chainId = network === "CELO_MAINNET" ? 42220 : 44787;

  const treasuryInterface = new ethers.Interface(TREASURY_ABI);
  const erc20Interface = new ethers.Interface(ERC20_ABI);

  // Transaction 1: Approve treasury to spend tokens
  const approveTx: UnsignedTransaction = {
    to: config.asset,
    data: erc20Interface.encodeFunctionData("approve", [
      config.treasury,
      amount,
    ]),
    value: "0",
    chainId,
    attribution: AGENT_CONFIG.ATTRIBUTION_TAG,
  };

  // Transaction 2: Deposit to treasury
  const depositTx: UnsignedTransaction = {
    to: config.treasury,
    data: treasuryInterface.encodeFunctionData("deposit", [amount, attribution]),
    value: "0",
    chainId,
    attribution: AGENT_CONFIG.ATTRIBUTION_TAG,
  };

  return [approveTx, depositTx];
}

/**
 * Build unsigned transaction for claiming dividend
 */
export function buildClaimTransaction(
  network: "CELO_MAINNET" | "CELO_SEPOLIA",
  humanAddress: string
): UnsignedTransaction {
  const config = AGENT_CONFIG.CONTRACTS[network];
  const chainId = network === "CELO_MAINNET" ? 42220 : 44787;

  const distributorInterface = new ethers.Interface(DISTRIBUTOR_ABI);

  return {
    to: config.distributor,
    data: distributorInterface.encodeFunctionData("claim", []),
    value: "0",
    chainId,
    attribution: AGENT_CONFIG.ATTRIBUTION_TAG,
  };
}

/**
 * Build unsigned transaction for Self registration
 * 
 * NOTE: In production, nullifier comes from Self ZK proof verification
 * For hackathon MVP, this is a stub - DO NOT use fake proofs in production
 */
export function buildRegisterTransaction(
  network: "CELO_MAINNET" | "CELO_SEPOLIA",
  nullifier: string // bytes32 from Self proof - STUB for hackathon
): UnsignedTransaction {
  const config = AGENT_CONFIG.CONTRACTS[network];
  const chainId = network === "CELO_MAINNET" ? 42220 : 44787;

  const registryInterface = new ethers.Interface(REGISTRY_ABI);

  return {
    to: config.registry,
    data: registryInterface.encodeFunctionData("register", [nullifier]),
    value: "0",
    chainId,
    attribution: AGENT_CONFIG.ATTRIBUTION_TAG,
  };
}

/**
 * Build unsigned transaction for creating a pledge commitment
 */
export function buildCreatePledgeTransaction(
  network: "CELO_MAINNET" | "CELO_SEPOLIA",
  params: {
    name: string; // Organization name
    revenuePercentBps: number; // e.g., 500 = 5%
    annualFloorUSD: string; // Minimum annual amount (18 decimals)
    startDate: number; // Unix timestamp
    endDate: number; // Unix timestamp (0 for perpetual)
    reportURI: string; // IPFS/Arweave URI
  }
): UnsignedTransaction {
  const config = AGENT_CONFIG.CONTRACTS[network];
  const chainId = network === "CELO_MAINNET" ? 42220 : 44787;

  const pledgeInterface = new ethers.Interface(PLEDGE_REGISTRY_ABI);

  return {
    to: config.pledgeRegistry,
    data: pledgeInterface.encodeFunctionData("createPledge", [
      params.name,
      params.revenuePercentBps,
      params.annualFloorUSD,
      params.startDate,
      params.endDate,
      params.reportURI,
    ]),
    value: "0",
    chainId,
    attribution: AGENT_CONFIG.ATTRIBUTION_TAG,
  };
}

/**
 * Query claimable amount (read-only, no transaction)
 */
export async function queryClaimable(
  network: "CELO_MAINNET" | "CELO_SEPOLIA",
  humanAddress: string
): Promise<string> {
  const config = AGENT_CONFIG.CONTRACTS[network];
  const rpcUrl = AGENT_CONFIG.RPC[network];

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const distributorInterface = new ethers.Interface(DISTRIBUTOR_ABI);
  const distributor = new ethers.Contract(
    config.distributor,
    distributorInterface,
    provider
  );

  const claimable = await distributor.claimable(humanAddress);
  return claimable.toString();
}

/**
 * Helper: Convert USD amount to token units
 */
export function usdToTokenUnits(
  usdAmount: string,
  decimals: number = 6
): string {
  return ethers.parseUnits(usdAmount, decimals).toString();
}

/**
 * Helper: Convert token units to USD amount
 */
export function tokenUnitsToUsd(
  tokenAmount: string,
  decimals: number = 6
): string {
  return ethers.formatUnits(tokenAmount, decimals);
}
