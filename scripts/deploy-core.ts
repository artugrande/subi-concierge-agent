/**
 * Despliega los cuatro contratos del núcleo de SUBI y los deja cableados.
 *
 *   npx hardhat run scripts/deploy-core.ts --network celo
 *
 * El orden importa y por eso está acá y no en pasos manuales. Registry y
 * distributor se necesitan mutuamente, así que ninguno puede recibir al otro
 * por constructor: el distributor se despliega primero y el cableado va después,
 * con `setDistributor` y `wire`. El despliegue anterior resolvió esa circularidad
 * con un placeholder (0x…01) que nunca se reemplazó, y quedó así en mainnet: el
 * registry jamás notificó al distributor.
 *
 * Al final el script verifica el cableado y aborta si algo quedó suelto.
 */
import { ethers } from "hardhat";

// Stablecoin de liquidación. Por defecto, USDT en Celo mainnet.
const ASSET = process.env.SUBI_ASSET ?? "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
const DRAW_RATE_BPS = Number(process.env.SUBI_DRAW_RATE_BPS ?? 400); // 4% anual

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No hay firmante. Falta DEPLOYER_PRIVATE_KEY en el .env.\n" +
      "  cp .env.example .env   y completar DEPLOYER_PRIVATE_KEY=0x…"
    );
  }

  const net = await ethers.provider.getNetwork();
  const saldo = await ethers.provider.getBalance(deployer.address);
  if (saldo === 0n) {
    throw new Error(`La wallet ${deployer.address} no tiene CELO para el gas.`);
  }

  console.log(`red        ${net.name} (${net.chainId})`);
  console.log(`deployer   ${deployer.address}`);
  console.log(`asset      ${ASSET}`);
  console.log(`gas        ${ethers.formatEther(saldo)} CELO`);
  console.log(`drawRate   ${DRAW_RATE_BPS} bps\n`);

  // 1. distributor (no necesita conocer a nadie todavía)
  const distributor = await (await ethers.getContractFactory("SubiDistributor"))
    .deploy(ASSET, DRAW_RATE_BPS);
  await distributor.waitForDeployment();
  console.log(`SubiDistributor  ${await distributor.getAddress()}`);

  // 2. registry
  const registry = await (await ethers.getContractFactory("SubiRegistry")).deploy();
  await registry.waitForDeployment();
  console.log(`SubiRegistry     ${await registry.getAddress()}`);

  // 3. treasury
  const treasury = await (await ethers.getContractFactory("SubiTreasury"))
    .deploy(ASSET, deployer.address);
  await treasury.waitForDeployment();
  console.log(`SubiTreasury     ${await treasury.getAddress()}`);

  // 4. pledge registry
  const pledges = await (await ethers.getContractFactory("PledgeRegistry")).deploy();
  await pledges.waitForDeployment();
  console.log(`PledgeRegistry   ${await pledges.getAddress()}\n`);

  // --- cableado ---
  console.log("cableando…");
  await (await registry.setDistributor(await distributor.getAddress())).wait();
  await (await treasury.setDistributor(await distributor.getAddress())).wait();
  await (await distributor.wire(
    await registry.getAddress(),
    await treasury.getAddress()
  )).wait();

  // --- verificación: si algo quedó suelto, no sigue ---
  const checks: [string, string, string][] = [
    ["registry.distributor", await registry.distributor(), await distributor.getAddress()],
    ["treasury.distributor", await treasury.distributor(), await distributor.getAddress()],
    ["distributor.registry", await distributor.registry(), await registry.getAddress()],
    ["distributor.treasury", await distributor.treasury(), await treasury.getAddress()],
  ];

  let ok = true;
  console.log("");
  for (const [nombre, real, esperado] of checks) {
    const bien = real.toLowerCase() === esperado.toLowerCase();
    if (!bien) ok = false;
    console.log(`  ${bien ? "✓" : "✗"} ${nombre.padEnd(22)} ${real}`);
  }

  if (!ok) throw new Error("el cableado quedó incompleto: no usar este despliegue");

  // Informativo: en una red donde el asset todavía no existe, esta lectura
  // revierte y no es motivo para abortar. El cableado ya quedó verificado arriba.
  try {
    console.log(`\n  ✓ distributable() = ${await distributor.distributable()}`);
  } catch {
    console.log(`\n  · distributable() no legible: ¿el asset ${ASSET} existe en esta red?`);
  }
  console.log("\nlisto. Falta fondear el treasury con deposit().");

  console.log("\n" + JSON.stringify({
    chainId: Number(net.chainId),
    asset: ASSET,
    drawRateBps: DRAW_RATE_BPS,
    distributor: await distributor.getAddress(),
    registry: await registry.getAddress(),
    treasury: await treasury.getAddress(),
    pledgeRegistry: await pledges.getAddress(),
    deployedAt: new Date().toISOString(),
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
