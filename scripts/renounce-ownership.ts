/**
 * Renuncia al ownership del treasury y del distributor, para que ningún humano
 * pueda tocar el fondo.
 *
 * Lo que puede hacer hoy la clave owner, verificado contra la cadena:
 *
 *   SubiTreasury     setDistributor(cualquiera) + withdraw  ->  mover todo el fondo
 *   SubiDistributor  setDrawRate(0 a 10%)                    ->  decidir cuánto se reparte
 *   SubiRegistry     nada: setDistributor ya se usó y es de una sola vez
 *
 * Después de correr esto:
 *
 *   treasury.owner()    = 0x000…000   setDistributor queda inaccesible para
 *                                     siempre, así que la plata solo puede salir
 *                                     por el distributor, o sea, por los cobros.
 *   distributor.owner() = 0x000…dEaD  su transferOwnership rechaza la dirección
 *                                     cero, así que se usa la de quema. La tasa de
 *                                     giro queda fija en su valor actual.
 *
 * ES IRREVERSIBLE. No hay rescate posible después: si aparece un bug, los fondos
 * solo salen por el camino del cobro. Por eso, por defecto, el script solo
 * simula, y hace falta CONFIRM_RENOUNCE=si para mandar las transacciones.
 *
 *   npm run renounce:mainnet                        # simula, no manda nada
 *   CONFIRM_RENOUNCE=si npm run renounce:mainnet    # manda
 *
 * Contra una copia local de mainnet, sin tocar nada real:
 *
 *   anvil --fork-url https://forno.celo.org --port 8547     # en otra terminal
 *   FORK_MAINNET=1 npx hardhat run scripts/renounce-ownership.ts --network celo-fork
 */
import { ethers, network } from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { withAttribution } from "../utils/attribution";

const CERO = ethers.ZeroAddress;
const QUEMA = "0x000000000000000000000000000000000000dEaD";

const dep = JSON.parse(readFileSync(join(__dirname, "..", "deployment-mainnet.json"), "utf8"));
const { treasury, distributor, registry } = dep.contracts;

const ABI = [
  "function owner() view returns (address)",
  "function transferOwnership(address)",
  "function setDistributor(address)",
  "function setDrawRate(uint256)",
  "function drawRateBps() view returns (uint256)",
  "function distributor() view returns (address)",
];
const iface = new ethers.Interface(ABI);

/** forno está detrás de un balanceador: tx.wait() no garantiza que la próxima lectura vea el cambio. */
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
  const fork = process.env.FORK_MAINNET === "1";
  const confirmado = process.env.CONFIRM_RENOUNCE === "si";

  if (fork) {
    // La copia la hace anvil: el nodo de Hardhat no trae el historial de
    // hardforks de Celo y no puede ejecutar sobre un bloque copiado.
    if (network.name !== "celo-fork") {
      throw new Error("FORK_MAINNET corre con --network celo-fork, contra un anvil que copia mainnet.");
    }
    console.log("Copia local de Celo mainnet (anvil). Nada de lo que pase acá toca la cadena real.\n");
  } else if (network.name !== "celo") {
    throw new Error(`Este script es para Celo mainnet (--network celo). Red actual: ${network.name}`);
  }

  const c = (a: string) => new ethers.Contract(a, ABI, ethers.provider);
  const t = c(treasury), d = c(distributor), r = c(registry);

  const [ownerT, ownerD, ownerR] = (await Promise.all([t.owner(), d.owner(), r.owner()])).map(String);
  console.log("Owners actuales");
  console.log(`  SubiTreasury     ${ownerT}`);
  console.log(`  SubiDistributor  ${ownerD}`);
  console.log(`  SubiRegistry     ${ownerR}  (sin poderes: setDistributor ya se usó)\n`);

  const pendientes = [
    { nombre: "SubiTreasury", contrato: t, direccion: treasury, destino: CERO, actual: ownerT },
    { nombre: "SubiDistributor", contrato: d, direccion: distributor, destino: QUEMA, actual: ownerD },
  ].filter((p) => p.actual.toLowerCase() !== p.destino.toLowerCase());

  if (!pendientes.length) {
    console.log("Ya estaba todo renunciado. Nada que hacer.");
    return;
  }

  const signer = fork
    ? await (async () => {
        const o = pendientes[0].actual;
        await network.provider.request({ method: "hardhat_setBalance", params: [o, "0x56BC75E2D63100000"] });
        return ethers.getImpersonatedSigner(o);
      })()
    : (await ethers.getSigners())[0];
  const yo = await signer.getAddress();

  for (const p of pendientes) {
    if (p.actual.toLowerCase() !== yo.toLowerCase()) {
      throw new Error(`${p.nombre}: el owner es ${p.actual} y la clave cargada es ${yo}. No se manda nada.`);
    }
  }

  console.log("Simulación desde el owner");
  for (const p of pendientes) {
    await ethers.provider.call({ to: p.direccion, from: yo, data: iface.encodeFunctionData("transferOwnership", [p.destino]) });
    console.log(`  ok  ${p.nombre}.transferOwnership(${p.destino})`);
  }

  if (!fork && !confirmado) {
    console.log("\nSolo simulación: no se mandó nada. Es irreversible; para mandar,");
    console.log("  CONFIRM_RENOUNCE=si npm run renounce:mainnet");
    return;
  }

  console.log("\nEnviando, con la etiqueta de atribución");
  for (const p of pendientes) {
    const data = await withAttribution(iface.encodeFunctionData("transferOwnership", [p.destino]));
    const tx = await signer.sendTransaction({ to: p.direccion, data });
    console.log(`  ${p.nombre}.transferOwnership  ${tx.hash}`);
    await tx.wait();
    const ok = await esperarValor(`${p.nombre}.owner()`, async () => String(await p.contrato.owner()), p.destino);
    if (!ok) throw new Error(`${p.nombre}: owner() no refleja ${p.destino}. Revisar en Celoscan antes de reintentar.`);
  }

  console.log("\nComprobación: el ex owner ya no puede nada");
  const pruebas: [string, string, string][] = [
    ["treasury.setDistributor", treasury, iface.encodeFunctionData("setDistributor", [yo])],
    ["treasury.transferOwnership", treasury, iface.encodeFunctionData("transferOwnership", [yo])],
    ["distributor.setDrawRate", distributor, iface.encodeFunctionData("setDrawRate", [0])],
    ["distributor.transferOwnership", distributor, iface.encodeFunctionData("transferOwnership", [yo])],
  ];
  let fallas = 0;
  for (const [nombre, to, data] of pruebas) {
    try {
      await ethers.provider.call({ to, from: yo, data });
      console.log(`  PROBLEMA  ${nombre} todavía pasa`);
      fallas++;
    } catch {
      console.log(`  ok  ${nombre} revierte`);
    }
  }

  console.log(`\n  treasury.distributor()    = ${await t.distributor()}  fijo para siempre`);
  console.log(`  distributor.drawRateBps() = ${await d.drawRateBps()}  fijo para siempre`);
  if (fallas) throw new Error(`${fallas} comprobación(es) fallaron`);
  console.log("\nNingún humano puede tocar el fondo.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
