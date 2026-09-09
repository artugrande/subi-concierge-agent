/**
 * Rescata los fondos atrapados en el SubiTreasury desplegado.
 *
 *   # simulación (no envía nada)
 *   npx hardhat run scripts/rescue-treasury.ts --network celo
 *
 *   # ejecución real
 *   SUBI_EXECUTE=1 SUBI_RESCUE_TO=0xTuDireccion \
 *     npx hardhat run scripts/rescue-treasury.ts --network celo
 *
 * Por qué hace falta: `SubiTreasury.withdraw` sólo acepta llamadas de
 * `distributor`, y el distributor desplegado no tiene ninguna línea que la
 * invoque. Los fondos quedan encerrados. Como el owner del treasury sí puede
 * reapuntar `distributor`, el rescate es apuntarlo a una EOA y retirar desde ahí.
 *
 * La clave privada sale de DEPLOYER_PRIVATE_KEY en el .env, igual que el resto
 * del proyecto: nunca se pasa por línea de comandos, así no queda en el historial.
 */
import { ethers } from "hardhat";

const TREASURY = process.env.SUBI_TREASURY ?? "0xaE18D9E48367Fc3d9D6977C221B1377Ce6B7c1A2";
const EXECUTE = process.env.SUBI_EXECUTE === "1";

const ABI = [
  "function owner() view returns (address)",
  "function distributor() view returns (address)",
  "function asset() view returns (address)",
  "function balance() view returns (uint256)",
  "function setDistributor(address)",
  "function withdraw(address,uint256)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("no hay firmante: falta DEPLOYER_PRIVATE_KEY en el .env");

  const destino = process.env.SUBI_RESCUE_TO ?? signer.address;
  const treasury = new ethers.Contract(TREASURY, ABI, signer);

  const owner = await treasury.owner();
  const distribuidorActual = await treasury.distributor();
  const asset = await treasury.asset();
  const saldo: bigint = await treasury.balance();

  const erc20 = new ethers.Contract(asset, ["function decimals() view returns (uint8)"], signer);
  const dec = Number(await erc20.decimals());
  const legible = ethers.formatUnits(saldo, dec);

  console.log(`treasury      ${TREASURY}`);
  console.log(`owner         ${owner}`);
  console.log(`firmante      ${signer.address}`);
  console.log(`distributor   ${distribuidorActual}`);
  console.log(`saldo         ${legible} (${saldo} unidades)`);
  console.log(`destino       ${destino}`);
  console.log(`modo          ${EXECUTE ? "EJECUCIÓN REAL" : "simulación"}\n`);

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`el firmante no es el owner del treasury (owner: ${owner})`);
  }
  if (saldo === 0n) {
    console.log("el treasury está vacío, no hay nada que rescatar");
    return;
  }

  if (!EXECUTE) {
    // Simula ambas llamadas sin enviarlas: si alguna fuese a revertir, salta acá.
    await treasury.setDistributor.staticCall(signer.address);
    console.log("  ✓ setDistributor simulado sin error");
    console.log("  · withdraw no se puede simular hasta que distributor esté reapuntado");
    console.log("\nPara ejecutarlo de verdad:");
    console.log(`  SUBI_EXECUTE=1 SUBI_RESCUE_TO=${destino} npx hardhat run scripts/rescue-treasury.ts --network celo`);
    return;
  }

  console.log("1/2  reapuntando distributor a la EOA…");
  const tx1 = await treasury.setDistributor(signer.address);
  console.log(`     ${tx1.hash}`);
  await tx1.wait();

  console.log(`2/2  retirando ${legible} a ${destino}…`);
  const tx2 = await treasury.withdraw(destino, saldo);
  console.log(`     ${tx2.hash}`);
  await tx2.wait();

  console.log(`\n  ✓ saldo final del treasury: ${ethers.formatUnits(await treasury.balance(), dec)}`);
  console.log("\nRecordá que el treasury queda con distributor apuntando a tu EOA.");
  console.log("Al redesplegar con deploy-core.ts se usa un treasury nuevo, así que este queda retirado de servicio.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exitCode = 1;
});
