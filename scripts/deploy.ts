import { ethers } from "hardhat";
import { AGENT_CONFIG, validateConfig } from "../config";
import { withAttribution, getAttributionInfo } from "../utils/attribution";

/**
 * Deploy script with Celo attribution tags
 * 
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network alfajores  # Testnet
 *   npx hardhat run scripts/deploy.ts --network celo       # Mainnet
 * 
 * IMPORTANT: Every transaction includes the Celo attribution tag
 * for hackathon credit tracking.
 */
async function main() {
  // Validate configuration
  validateConfig();
  
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("=== SUBI Concierge Agent Deployment ===");
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "CELO");
  console.log();
  
  const attribution = getAttributionInfo();
  console.log("Attribution Info:");
  console.log("  Tag:", attribution.tag);
  console.log("  Agent ID:", attribution.agentId);
  console.log("  Agent Wallet:", attribution.agentWallet);
  console.log();
  
  // Example: Deploy SUBIConcierge contract
  console.log("Deploying SUBIConcierge contract...");
  
  const SUBIConcierge = await ethers.getContractFactory("SUBIConcierge");
  
  // Get deployment transaction data
  const deployTx = await SUBIConcierge.getDeployTransaction(
    AGENT_CONFIG.AGENT_WALLET_ADDRESS
  );
  
  // Add attribution tag to deployment data
  const deployTxWithAttribution = {
    ...deployTx,
    data: withAttribution(deployTx.data as string),
  };
  
  // Send deployment transaction
  const tx = await deployer.sendTransaction(deployTxWithAttribution);
  console.log("Deployment transaction sent:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt?.blockNumber);
  
  // Get deployed contract address
  const contractAddress = receipt?.contractAddress;
  console.log("SUBIConcierge deployed to:", contractAddress);
  console.log();
  
  // Example: Send a transaction to the deployed contract
  if (contractAddress) {
    console.log("Calling initialize function with attribution...");
    const contract = SUBIConcierge.attach(contractAddress);
    
    // Get the transaction data for the initialize call
    const initializeData = contract.interface.encodeFunctionData("initialize");
    
    // Send transaction with attribution
    const initTx = await deployer.sendTransaction({
      to: contractAddress,
      data: withAttribution(initializeData),
    });
    
    console.log("Initialize transaction sent:", initTx.hash);
    const initReceipt = await initTx.wait();
    console.log("Initialize confirmed in block:", initReceipt?.blockNumber);
  }
  
  console.log();
  console.log("=== Deployment Complete ===");
  console.log();
  console.log("IMPORTANT: Verify first tagged transaction:");
  console.log(`  npx @celo/attribution-tags verifyTx ${tx.hash} --network celo`);
  console.log();
  console.log("Contract addresses:");
  console.log("  SUBIConcierge:", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
