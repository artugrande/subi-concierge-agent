import { AGENT_CONFIG } from "../config";

/**
 * Etiqueta de atribución de Celo (ERC-8021) sobre el calldata.
 *
 * Se tagean las transacciones que el proyecto envía y quiere que se le
 * acrediten, no sólo los despliegues: los programas de recompensas acreditan
 * por código asignado y leen el sufijo de cada transacción.
 *
 * Dos detalles que hacen que esto no sea un import normal:
 *
 * 1. `@celo/attribution-tags` es ESM puro (`"type": "module"`, sin condición
 *    `require` en sus exports). El runner de Hardhat es CommonJS, así que un
 *    import estático rompe con ERR_REQUIRE_ESM y `npm test` no arranca. Se
 *    carga con `import()` dinámico, envuelto en `new Function` para que
 *    TypeScript no lo compile a `require()` al emitir CommonJS.
 *
 * 2. `toDataSuffix` YA devuelve la cadena con prefijo `0x`. Concatenarle otro
 *    produce `0x0x63656c6f…`, que no es calldata válida.
 */

type ToDataSuffix = (tag: string | string[]) => string;
type FromDataSuffix = (suffix: string) => { codes: string[]; schemaId: number };

// `import()` literal sobreviviría a la compilación a CommonJS convertido en
// `require()`, que es justo lo que hay que evitar acá.
const importESM = new Function("s", "return import(s)") as (s: string) => Promise<any>;

let cached: ToDataSuffix | null = null;
let cachedFrom: FromDataSuffix | null = null;

/** Carga perezosa del módulo ESM, una sola vez por proceso. */
async function getToDataSuffix(): Promise<ToDataSuffix> {
  if (!cached) {
    const mod = await importESM("@celo/attribution-tags");
    cached = mod.toDataSuffix as ToDataSuffix;
  }
  return cached;
}

/**
 * Decodifica un sufijo de atribución. Vive acá y no en quien lo use para que
 * nadie más tenga que lidiar con la carga del módulo ESM.
 */
export async function decodeAttribution(
  suffix: string
): Promise<{ codes: string[]; schemaId: number }> {
  if (!cachedFrom) {
    const mod = await importESM("@celo/attribution-tags");
    cachedFrom = mod.fromDataSuffix as FromDataSuffix;
  }
  return cachedFrom(suffix);
}

/** Sufijo de atribución del proyecto, con prefijo 0x. */
export async function attributionSuffix(): Promise<string> {
  const toDataSuffix = await getToDataSuffix();
  return toDataSuffix(AGENT_CONFIG.ATTRIBUTION_TAG);
}

/**
 * Agrega la etiqueta al final del calldata.
 * @param data calldata de la llamada o del despliegue; `0x` para transferencias simples
 */
export async function withAttribution(data: string = "0x"): Promise<string> {
  const suffix = await attributionSuffix();          // viene con 0x
  const base = data.startsWith("0x") ? data.slice(2) : data;
  return "0x" + base + suffix.slice(2);
}

/** Devuelve la transacción con la etiqueta ya aplicada sobre `data`. */
export async function addAttributionToTx<T extends { data?: string }>(tx: T): Promise<T> {
  return { ...tx, data: await withAttribution(tx.data) };
}

/** Datos de referencia del agente, para logs y para el MCP. */
export function getAttributionInfo() {
  return {
    tag: AGENT_CONFIG.ATTRIBUTION_TAG,
    agentId: AGENT_CONFIG.AGENT_ID,
    agentWallet: AGENT_CONFIG.AGENT_WALLET_ADDRESS,
  };
}
