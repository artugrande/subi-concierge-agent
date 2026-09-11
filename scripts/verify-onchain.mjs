/**
 * Verificación independiente contra Celo mainnet.
 *
 * No lee el estado del repo: toma las direcciones de deployment-mainnet.json y
 * comprueba todo contra la cadena. Sirve para que alguien que no confía en el
 * código igual pueda confirmar qué está desplegado, en un solo comando.
 *
 *   npm run verify:onchain
 *
 * Sale con código 1 si alguna comprobación falla, así sirve en CI.
 */
import { ethers } from "ethers";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const dep = JSON.parse(readFileSync(join(raiz, "deployment-mainnet.json"), "utf8"));

const RPC = process.env.CELO_RPC_URL || "https://forno.celo.org";
const { distributor, registry, treasury, pledgeRegistry } = dep.contracts;

const provider = new ethers.JsonRpcProvider(RPC);
const leer = (dir, sig) => new ethers.Contract(dir, [sig], provider);

let fallos = 0;
const ok = (b) => (b ? "\x1b[32mok\x1b[0m" : ((fallos++), "\x1b[31mFALLA\x1b[0m"));
const fila = (etiqueta, valor, bien) =>
  console.log(`  ${etiqueta.padEnd(30)} ${String(valor).padEnd(46)} ${ok(bien)}`);

console.log("\nSUBI · verificación contra Celo mainnet");
console.log(`RPC ${RPC}\n`);

const red = await provider.getNetwork();
console.log("Red");
fila("chainId", red.chainId.toString(), red.chainId === 42220n);

console.log("\nContratos desplegados");
for (const [nombre, dir] of Object.entries({ distributor, registry, treasury, pledgeRegistry })) {
  const code = await provider.getCode(dir);
  fila(nombre, `${dir} (${code === "0x" ? "sin código" : code.length / 2 - 1 + " bytes"})`, code !== "0x");
}

console.log("\nCableado cruzado");
const rd = await leer(registry, "function distributor() view returns (address)").distributor();
const dr = await leer(distributor, "function registry() view returns (address)").registry();
const dt = await leer(distributor, "function treasury() view returns (address)").treasury();
fila("registry.distributor()", rd, rd.toLowerCase() === distributor.toLowerCase());
fila("distributor.registry()", dr, dr.toLowerCase() === registry.toLowerCase());
fila("distributor.treasury()", dt, dt.toLowerCase() === treasury.toLowerCase());

console.log("\nCamino del dinero");
const distribuible = await leer(distributor, "function distributable() view returns (uint256)").distributable();
const saldoTesoro = await leer(dep.asset, "function balanceOf(address) view returns (uint256)").balanceOf(treasury);
// La prueba de que se arregló el bug: el treasury cuenta como distribuible.
fila("distributable()", distribuible.toString(), distribuible >= saldoTesoro && saldoTesoro > 0n);
fila("balance del treasury", saldoTesoro.toString(), true);

console.log("\nIdentidad con Self");
const scope = await leer(registry, "function scope() view returns (uint256)").scope();
const cfg = await leer(registry, "function verificationConfigId() view returns (bytes32)").verificationConfigId();
fila("scope()", scope.toString().slice(0, 44) + "…", scope !== 0n);
fila("verificationConfigId()", cfg, cfg !== ethers.ZeroHash);

// El alta insegura no está desactivada: no existe. El selector de register(bytes32)
// no aparece en el bytecode desplegado, así que no hay forma de llamarla.
const codigoRegistry = await provider.getCode(registry);
const selector = ethers.id("register(bytes32)").slice(2, 10);
fila(`selector register(bytes32)`, `0x${selector} ausente del bytecode`, !codigoRegistry.includes(selector));

console.log("\nNadie puede tocar el fondo");
const oT = await leer(treasury, "function owner() view returns (address)").owner();
const oD = await leer(distributor, "function owner() view returns (address)").owner();
fila("treasury.owner()", oT, oT === ethers.ZeroAddress);
fila("distributor.owner()", oD, oD.toLowerCase() === "0x000000000000000000000000000000000000dead");
// El ex owner ya no puede redirigir el fondo: se simula, no se manda nada.
let redirige = true;
try {
  await provider.call({ from: dep.deployer, to: treasury,
    data: new ethers.Interface(["function setDistributor(address)"]).encodeFunctionData("setDistributor", [dep.deployer]) });
} catch { redirige = false; }
fila("setDistributor del ex owner", redirige ? "pasa" : "revierte", !redirige);

console.log("\nPadrón");
const activos = await leer(registry, "function activeCount() view returns (uint256)").activeCount();
console.log(`  ${"activeCount()".padEnd(30)} ${activos.toString()}`);
if (activos === 0n) console.log("  \x1b[33mnota\x1b[0m  todavía no hay humanos verificados en el padrón");

console.log(fallos === 0 ? "\n\x1b[32mTodo verificado contra la cadena.\x1b[0m\n" : `\n\x1b[31m${fallos} comprobación(es) fallaron.\x1b[0m\n`);
process.exit(fallos === 0 ? 0 : 1);
