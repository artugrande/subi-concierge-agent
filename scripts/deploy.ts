import { ethers } from "hardhat";

async function main() {
  console.log("Deploying SUBI Concierge Agent contracts...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "CELO");

  // Configuration
  const DRAW_RATE_BPS = 400; // 4% annual draw rate (Alaska POMV-style)
  
  // For mainnet, use real USDC/cUSD address
  // Celo Mainnet cUSD (Mento): 0x765DE816845861e75A25fCA122bb6898B8B1282a
  // Celo Mainnet USDC (Circle): 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
  const ASSET_ADDRESS = process.env.ASSET_ADDRESS || "";

  let asset;
  
  if (!ASSET_ADDRESS) {
    console.log("No ASSET_ADDRESS provided, deploying MockERC20 for testing...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    asset = await MockERC20.deploy("USD Coin", "USDC", 6);
    await asset.waitForDeployment();
    console.log("MockERC20 deployed to:", await asset.getAddress());
  } else {
    console.log("Using asset at:", ASSET_ADDRESS);
    asset = await ethers.getContractAt("MockERC20", ASSET_ADDRESS);
  }

  // Deploy Treasury
  console.log("\nDeploying SubiTreasury...");
  const SubiTreasury = await ethers.getContractFactory("SubiTreasury");
  const treasury = await SubiTreasury.deploy(
    await asset.getAddress(),
    deployer.address
  );
  await treasury.waitForDeployment();
  console.log("SubiTreasury deployed to:", await treasury.getAddress());

  // Deploy Registry with placeholder
  console.log("\nDeploying SubiRegistry...");
  const SubiRegistry = await ethers.getContractFactory("SubiRegistry");
  const placeholderDistributor = "0x0000000000000000000000000000000000000001";
  const registry = await SubiRegistry.deploy(placeholderDistributor);
  await registry.waitForDeployment();
  console.log("SubiRegistry deployed to:", await registry.getAddress());

  // Deploy Distributor
  console.log("\nDeploying SubiDistributor...");
  const SubiDistributor = await ethers.getContractFactory("SubiDistributor");
  const distributor = await SubiDistributor.deploy(
    await asset.getAddress(),
    await registry.getAddress(),
    DRAW_RATE_BPS
  );
  await distributor.waitForDeployment();
  console.log("SubiDistributor deployed to:", await distributor.getAddress());

  // Link Treasury to Distributor
  console.log("\nLinking Treasury to Distributor...");
  await treasury.setDistributor(await distributor.getAddress());
  console.log("Treasury linked to Distributor");

  // Deploy PledgeRegistry
  console.log("\nDeploying PledgeRegistry...");
  const PledgeRegistry = await ethers.getContractFactory("PledgeRegistry");
  const pledgeRegistry = await PledgeRegistry.deploy();
  await pledgeRegistry.waitForDeployment();
  console.log("PledgeRegistry deployed to:", await pledgeRegistry.getAddress());

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("Asset (USDC/cUSD):", await asset.getAddress());
  console.log("SubiTreasury:", await treasury.getAddress());
  console.log("SubiRegistry:", await registry.getAddress());
  console.log("SubiDistributor:", await distributor.getAddress());
  console.log("PledgeRegistry:", await pledgeRegistry.getAddress());
  console.log("\nConfiguration:");
  console.log("Draw Rate:", DRAW_RATE_BPS / 100, "%");
  console.log("Owner:", deployer.address);

  // Export for agent scripts
  const deployment = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contracts: {
      asset: await asset.getAddress(),
      treasury: await treasury.getAddress(),
      registry: await registry.getAddress(),
      distributor: await distributor.getAddress(),
      pledgeRegistry: await pledgeRegistry.getAddress(),
    },
    config: {
      drawRateBps: DRAW_RATE_BPS,
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\nDeployment config saved for agent integration");
  console.log(JSON.stringify(deployment, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
