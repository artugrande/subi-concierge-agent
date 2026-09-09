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

// Identity Verification Hub V2 de Self. Direcciones tomadas del boilerplate oficial
// (github.com/selfxyz/self-integration-boilerplate). No inventar: una dirección
// equivocada acá deja el padrón sin poder verificar a nadie.
const SELF_HUB: Record<number, string> = {
  42220: "0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF",     // Celo mainnet
  11142220: "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74",  // Celo Sepolia
};

// La semilla del scope, junto con la dirección del registry, determina el nullifier.
// Cambiarla invalida el padrón entero, así que se fija una vez y no se toca.
const SCOPE_SEED = process.env.SUBI_SCOPE_SEED ?? "subi-space";
const MIN_AGE = Number(process.env.SUBI_MIN_AGE ?? 18);
const DRAW_RATE_BPS = Number(process.env.SUBI_DRAW_RATE_BPS ?? 400); // 4% anual

/**
 * Relee un valor hasta que coincida con lo esperado.
 *
 * `tx.wait()` garantiza que la transacción entró en un bloque, pero no que el
 * nodo RPC que te toca en la próxima lectura ya tenga ese estado: forno está
 * detrás de un balanceador y podés pegarle a una réplica atrasada. Sin esto,
 * la verificación fallaba de forma intermitente sobre un cableado correcto.
 */
async function esperarValor(
  nombre: string,
  leer: () => Promise<string>,
  esperado: string,
  intentos = 12,
  esperaMs = 2500
): Promise<boolean> {
  for (let i = 0; i < intentos; i++) {
    try {
      const real = await leer();
      if (real.toLowerCase() === esperado.toLowerCase()) return true;
      if (i === 0) console.log(`    · ${nombre} todavía no refleja el cambio, reintentando…`);
    } catch { /* réplica atrasada: reintentar */ }
    await new Promise((r) => setTimeout(r, esperaMs));
  }
  return false;
}

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

  // 2. registry, atado al hub de Self de esta red
  const hub = SELF_HUB[Number(net.chainId)];
  if (!hub) {
    throw new Error(
      `No hay Identity Verification Hub de Self conocido para la chain ${net.chainId}. ` +
      `Redes soportadas: ${Object.keys(SELF_HUB).join(", ")}.`
    );
  }
  if ((await ethers.provider.getCode(hub)) === "0x") {
    throw new Error(`El hub de Self ${hub} no tiene código en esta red.`);
  }

  const registry = await (await ethers.getContractFactory("SubiRegistry")).deploy(
    hub,
    SCOPE_SEED,
    { olderThan: MIN_AGE, forbiddenCountries: [], ofacEnabled: false }
  );
  await registry.waitForDeployment();
  console.log(`SubiRegistry     ${await registry.getAddress()}`);
  console.log(`  hub de Self    ${hub}`);
  console.log(`  scope seed     "${SCOPE_SEED}"  ·  edad mínima ${MIN_AGE}`);

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
  const dAddr = await distributor.getAddress();
  const gAddr = await registry.getAddress();
  const tAddr = await treasury.getAddress();

  const checks: [string, () => Promise<string>, string][] = [
    ["registry.distributor", () => registry.distributor(), dAddr],
    ["treasury.distributor", () => treasury.distributor(), dAddr],
    ["distributor.registry", () => distributor.registry(), gAddr],
    ["distributor.treasury", () => distributor.treasury(), tAddr],
  ];

  let ok = true;
  console.log("");
  for (const [nombre, leer, esperado] of checks) {
    const bien = await esperarValor(nombre, leer, esperado);
    if (!bien) ok = false;
    console.log(`  ${bien ? "✓" : "✗"} ${nombre.padEnd(22)} ${esperado}`);
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
    selfHub: hub,
    scopeSeed: SCOPE_SEED,
    minAge: MIN_AGE,
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
