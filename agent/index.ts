import { ethers } from "ethers";
import { AGENT_CONFIG, validateConfig } from "../config";
import { 
  buildClaimUBITransaction,
  buildPledgeUBITransaction,
  buildTransferTransaction,
  getAgentInfo
} from "./transactions";

/**
 * SUBI Concierge Agent
 * 
 * Main agent logic for handling UBI claims and pledges on Celo.
 * All transactions are built with the required attribution tag.
 */

async function main() {
  validateConfig();
  
  console.log("=== SUBI Concierge Agent ===");
  console.log();
  
  const agentInfo = getAgentInfo();
  console.log("Agent Info:");
  console.log("  Wallet:", agentInfo.agentWallet);
  console.log("  Agent ID:", agentInfo.agentId);
  console.log("  Attribution Tag:", agentInfo.attributionTag);
  console.log();
  
  // Connect to Celo network
  const provider = new ethers.JsonRpcProvider(AGENT_CONFIG.CELO_RPC_URL);
  const network = await provider.getNetwork();
  console.log("Connected to network:", network.name, "Chain ID:", network.chainId);
  console.log();
  
  // Example: Build transactions (would be triggered by user requests)
  console.log("Example: Building UBI claim transaction...");
  const ubiContractAddress = "0x0000000000000000000000000000000000000000"; // Placeholder
  const claimTx = buildClaimUBITransaction(
    ubiContractAddress,
    ethers.parseEther("10")
  );
  console.log("Claim transaction built:");
  console.log("  To:", claimTx.to);
  console.log("  Data:", claimTx.data?.substring(0, 66) + "...");
  console.log("  (Attribution tag included in data)");
  console.log();
  
  console.log("Example: Building UBI pledge transaction...");
  const pledgeContractAddress = "0x0000000000000000000000000000000000000000"; // Placeholder
  const pledgeTx = buildPledgeUBITransaction(
    pledgeContractAddress,
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    ethers.parseEther("5")
  );
  console.log("Pledge transaction built:");
  console.log("  To:", pledgeTx.to);
  console.log("  Value:", pledgeTx.value?.toString());
  console.log("  Data:", pledgeTx.data?.substring(0, 66) + "...");
  console.log("  (Attribution tag included in data)");
  console.log();
  
  console.log("Example: Building simple transfer transaction...");
  const transferTx = buildTransferTransaction(
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    ethers.parseEther("1")
  );
  console.log("Transfer transaction built:");
  console.log("  To:", transferTx.to);
  console.log("  Value:", transferTx.value?.toString());
  console.log("  Data:", transferTx.data);
  console.log("  (Attribution tag included in data)");
  console.log();
  
  console.log("NOTE: These are unsigned transactions.");
  console.log("To send them, they would need to be signed with the agent wallet private key.");
  console.log("For security, private keys should NEVER be committed to the repo.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
