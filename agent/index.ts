import { ethers } from "ethers";
import { AGENT_CONFIG, validateConfig } from "../config";
import { 
  buildClaimUBITransaction,
  buildPledgeUBITransaction,
  buildTransferTransaction,
  getAgentInfo
} from "./transactions";
import deployment from "./deployment-mainnet.json";

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
  // Direcciones reales del despliegue, no placeholders: un 0x000... arma calldata
  // que parece válida y revierte contra la cadena.
  console.log("Ejemplo: transacción de cobro...");
  const claimTx = await buildClaimUBITransaction(deployment.contracts.distributor);
  console.log("  A:", claimTx.to);
  console.log("  feeCurrency:", claimTx.feeCurrency);
  console.log("  Data:", claimTx.data?.substring(0, 66) + "...");
  console.log("  (lleva la etiqueta de atribución)");
  console.log();
  
  console.log("Ejemplo: registrar un compromiso público...");
  const ahora = BigInt(Math.floor(Date.now() / 1000));
  const pledgeTx = await buildPledgeUBITransaction(deployment.contracts.pledgeRegistry, {
    name: "Organización de ejemplo",
    revenuePercentBps: 250,          // 2,5% de los ingresos
    annualFloorUSD: 1_000_000n,
    startDate: ahora,
    endDate: ahora + 31_536_000n,    // un año
    reportURI: "ipfs://informe-de-ejemplo",
  });
  console.log("  A:", pledgeTx.to);
  console.log("  feeCurrency:", pledgeTx.feeCurrency);
  console.log("  Data:", pledgeTx.data?.substring(0, 66) + "...");
  console.log("  (lleva la etiqueta de atribución)");
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
