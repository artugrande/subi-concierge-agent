import { ethers } from "ethers";
import { AGENT_CONFIG } from "../config";
import { addAttributionToTx } from "../utils/attribution";
import deployment from "./deployment-mainnet.json";

/**
 * Constructores de transacciones del SUBI Concierge Agent.
 *
 * Dos reglas que valen para todo lo de acá:
 *
 * 1. Toda transacción lleva la etiqueta de atribución (ERC-8021). Los programas
 *    de recompensas acreditan por código asignado y leen el sufijo del calldata,
 *    así que se tagea lo que el proyecto envía, no sólo los despliegues.
 *
 * 2. Toda transacción lleva `feeCurrency` (CIP-64), así el gas se paga en la
 *    misma stablecoin que se mueve y nadie necesita tener CELO. Es el punto
 *    entero del diseño: si alguien tiene que comprar un token de red antes de
 *    poder cobrar, el producto no sirve para quien no tiene banco.
 *
 * Las firmas de acá abajo son las de los contratos realmente desplegados. Si un
 * contrato cambia, esto tiene que cambiar con él: una firma equivocada produce
 * calldata que revierte, y la etiqueta de atribución sigue estando igual, así
 * que un test que sólo mira el sufijo no lo detecta.
 */

const ASSET: string = deployment.asset;

export interface UnsignedTransaction {
  to: string;
  value?: bigint;
  data?: string;
  gasLimit?: bigint;
  chainId?: number;
  /** CIP-64: token ERC-20 en el que se paga el gas. */
  feeCurrency?: string;
}

/** Base común: atribución más moneda de gas. */
async function construir(tx: {
  to: string;
  data?: string;
  value?: bigint;
}): Promise<UnsignedTransaction> {
  return await addAttributionToTx({ ...tx, feeCurrency: ASSET });
}

/**
 * Cobrar el dividendo acumulado.
 *
 * `SubiDistributor.claim()` no recibe argumentos: el monto se deriva del índice
 * acumulado y del checkpoint de quien llama. No se le pasa un importe.
 */
export async function buildClaimUBITransaction(
  distributorAddress: string
): Promise<UnsignedTransaction> {
  const iface = new ethers.Interface(["function claim() returns (uint256)"]);
  return await construir({
    to: distributorAddress,
    data: iface.encodeFunctionData("claim", []),
    value: 0n,
  });
}

export interface PledgeParams {
  /** Nombre público de la organización que se compromete. */
  name: string;
  /** Porcentaje de ingresos comprometido, en puntos básicos (10000 = 100%). */
  revenuePercentBps: number | bigint;
  /** Piso anual en USD, en unidades enteras. */
  annualFloorUSD: bigint;
  /** Inicio y fin del compromiso, en segundos unix. */
  startDate: bigint;
  endDate: bigint;
  /** URI del informe público de cumplimiento. */
  reportURI: string;
}

/**
 * Registrar un compromiso público de aporte.
 *
 * La firma real es
 * `createPledge(string,uint256,uint256,uint256,uint256,string)`. No existe
 * ninguna función `pledge(address,uint256)`, y esto no mueve valor nativo: el
 * compromiso es un registro, el dinero entra después por el treasury.
 */
export async function buildPledgeUBITransaction(
  pledgeRegistryAddress: string,
  pledge: PledgeParams
): Promise<UnsignedTransaction> {
  if (BigInt(pledge.revenuePercentBps) > 10000n) {
    throw new Error("revenuePercentBps no puede pasar de 10000 (100%).");
  }
  const iface = new ethers.Interface([
    "function createPledge(string name, uint256 revenuePercentBps, uint256 annualFloorUSD, uint256 startDate, uint256 endDate, string reportURI) returns (uint256)",
  ]);
  return await construir({
    to: pledgeRegistryAddress,
    data: iface.encodeFunctionData("createPledge", [
      pledge.name,
      pledge.revenuePercentBps,
      pledge.annualFloorUSD,
      pledge.startDate,
      pledge.endDate,
      pledge.reportURI,
    ]),
    value: 0n,
  });
}

/**
 * Aportar al treasury. Son dos transacciones: autorizar y depositar.
 * `SubiTreasury.deposit(uint256,string)` guarda la atribución en el registro público.
 */
export async function buildDepositTransactions(
  treasuryAddress: string,
  amount: bigint,
  attribution: string
): Promise<UnsignedTransaction[]> {
  if (amount <= 0n) throw new Error("El monto tiene que ser mayor que cero.");
  const erc20 = new ethers.Interface(["function approve(address,uint256) returns (bool)"]);
  const treasury = new ethers.Interface(["function deposit(uint256 amount, string attribution)"]);
  return [
    await construir({
      to: ASSET,
      data: erc20.encodeFunctionData("approve", [treasuryAddress, amount]),
      value: 0n,
    }),
    await construir({
      to: treasuryAddress,
      data: treasury.encodeFunctionData("deposit", [amount, attribution]),
      value: 0n,
    }),
  ];
}

/** Transferencia simple. También se tagea. */
export async function buildTransferTransaction(
  to: string,
  amount: bigint
): Promise<UnsignedTransaction> {
  return await construir({ to, value: amount, data: "0x" });
}

/**
 * Llamada genérica a un contrato.
 * @param functionSignature por ejemplo `transfer(address,uint256)`
 */
export async function buildContractCallTransaction(
  contractAddress: string,
  functionSignature: string,
  args: any[],
  value: bigint = 0n
): Promise<UnsignedTransaction> {
  const iface = new ethers.Interface([`function ${functionSignature}`]);
  const functionName = functionSignature.split("(")[0];
  return await construir({
    to: contractAddress,
    data: iface.encodeFunctionData(functionName, args),
    value,
  });
}

/** Arma varias transacciones, todas atribuidas. */
export async function buildTransactionBatch(
  transactions: (() => Promise<UnsignedTransaction>)[]
): Promise<UnsignedTransaction[]> {
  return Promise.all(transactions.map((txBuilder) => txBuilder()));
}

/** Datos de referencia del agente. */
export function getAgentInfo() {
  return {
    agentWallet: AGENT_CONFIG.AGENT_WALLET_ADDRESS,
    agentId: AGENT_CONFIG.AGENT_ID,
    attributionTag: AGENT_CONFIG.ATTRIBUTION_TAG,
    feeCurrency: ASSET,
  };
}
