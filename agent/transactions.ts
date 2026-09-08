import { ethers } from "ethers";
import { AGENT_CONFIG } from "../config";
import { withAttribution, addAttributionToTx } from "../utils/attribution";

/**
 * Transaction builder for SUBI Concierge Agent
 * 
 * All transaction builders MUST include the Celo attribution tag
 * for hackathon credit tracking.
 */

export interface UnsignedTransaction {
  to: string;
  value?: bigint;
  data?: string;
  gasLimit?: bigint;
  chainId?: number;
}

/**
 * Build a transaction to claim UBI
 * 
 * @param ubiContractAddress - Address of the UBI contract
 * @param amount - Amount to claim in wei
 * @returns Unsigned transaction with attribution tag
 */
export function buildClaimUBITransaction(
  ubiContractAddress: string,
  amount: bigint
): UnsignedTransaction {
  // Create contract interface for UBI claim
  const iface = new ethers.Interface([
    "function claim(uint256 amount)",
  ]);
  
  const data = iface.encodeFunctionData("claim", [amount]);
  
  // Return transaction with attribution tag
  return addAttributionToTx({
    to: ubiContractAddress,
    data,
    value: 0n,
  });
}

/**
 * Build a transaction to pledge UBI
 * 
 * @param pledgeContractAddress - Address of the pledge contract
 * @param beneficiary - Address of the beneficiary
 * @param amount - Amount to pledge in wei
 * @returns Unsigned transaction with attribution tag
 */
export function buildPledgeUBITransaction(
  pledgeContractAddress: string,
  beneficiary: string,
  amount: bigint
): UnsignedTransaction {
  const iface = new ethers.Interface([
    "function pledge(address beneficiary, uint256 amount)",
  ]);
  
  const data = iface.encodeFunctionData("pledge", [beneficiary, amount]);
  
  return addAttributionToTx({
    to: pledgeContractAddress,
    data,
    value: amount, // Assuming pledge requires sending value
  });
}

/**
 * Build a simple transfer transaction
 * 
 * @param to - Recipient address
 * @param amount - Amount to send in wei
 * @returns Unsigned transaction with attribution tag
 */
export function buildTransferTransaction(
  to: string,
  amount: bigint
): UnsignedTransaction {
  // Even simple transfers need attribution
  return addAttributionToTx({
    to,
    value: amount,
    data: "0x", // Empty data for simple transfer
  });
}

/**
 * Build a transaction to call any contract function
 * 
 * @param contractAddress - Address of the contract
 * @param functionSignature - Function signature (e.g., "transfer(address,uint256)")
 * @param args - Function arguments
 * @param value - Optional value to send with transaction
 * @returns Unsigned transaction with attribution tag
 */
export function buildContractCallTransaction(
  contractAddress: string,
  functionSignature: string,
  args: any[],
  value: bigint = 0n
): UnsignedTransaction {
  const iface = new ethers.Interface([`function ${functionSignature}`]);
  const functionName = functionSignature.split("(")[0];
  const data = iface.encodeFunctionData(functionName, args);
  
  return addAttributionToTx({
    to: contractAddress,
    data,
    value,
  });
}

/**
 * Build a batch of transactions (all with attribution)
 * 
 * @param transactions - Array of transaction builders
 * @returns Array of unsigned transactions with attribution tags
 */
export function buildTransactionBatch(
  transactions: (() => UnsignedTransaction)[]
): UnsignedTransaction[] {
  return transactions.map(txBuilder => txBuilder());
}

/**
 * Get agent configuration info
 */
export function getAgentInfo() {
  return {
    agentWallet: AGENT_CONFIG.AGENT_WALLET_ADDRESS,
    agentId: AGENT_CONFIG.AGENT_ID,
    attributionTag: AGENT_CONFIG.ATTRIBUTION_TAG,
  };
}
