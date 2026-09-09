/**
 * MCP de SUBI
 * ===========
 * Servidor MCP propio del proyecto, sobre HTTP (JSON-RPC 2.0). Expone el estado
 * del padrón y del fondo, y arma transacciones SIN FIRMAR para que las firme quien
 * tenga las llaves. El servidor nunca custodia nada ni pide una clave privada.
 *
 * Es intencionalmente independiente del MCP oficial de Celo: aquello es una
 * herramienta general de la cadena y no el lugar para los endpoints de un proyecto.
 *
 * Endpoint: POST /api/mcp
 */
import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import deployment from "../../../deployment-mainnet.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC = process.env.CELO_RPC_URL || "https://forno.celo.org";
const C = deployment.contracts;
const ASSET = deployment.asset;
const DEC = deployment.assetDecimals ?? 6;

const ABI = {
  distributor: [
    "function distributable() view returns (uint256)",
    "function claimable(address) view returns (uint256)",
    "function drawRateBps() view returns (uint256)",
    "function accruedUnclaimed() view returns (uint256)",
    "function claim() returns (uint256)",
  ],
  registry: [
    "function isActive(address) view returns (bool)",
    "function activeCount() view returns (uint256)",
    "function registrations(address) view returns (uint256 nullifier, uint256 expiration, uint256 unbindTime)",
    "function scope() view returns (uint256)",
  ],
  treasury: [
    "function balance() view returns (uint256)",
    "function totalDeposited() view returns (uint256)",
    "function contributions(address) view returns (uint256)",
    "function deposit(uint256 amount, string attribution)",
  ],
  erc20: ["function approve(address,uint256)", "function balanceOf(address) view returns (uint256)"],
};

const provider = () => new ethers.JsonRpcProvider(RPC);
const fmt = (v: bigint) => ethers.formatUnits(v, DEC);

/* ============================================================
   Herramientas
   ============================================================ */
const TOOLS = [
  {
    name: "subi_status",
    description:
      "Estado del fondo de SUBI en Celo mainnet: saldo del treasury, tamaño del padrón, " +
      "monto distribuible y dividendo diario por persona al ritmo actual.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "subi_claimable",
    description: "Cuánto tiene para cobrar una dirección ahora mismo, en la stablecoin del fondo.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string", description: "Dirección a consultar (0x…)" } },
      required: ["address"],
      additionalProperties: false,
    },
  },
  {
    name: "subi_registration",
    description:
      "Estado de una dirección en el padrón: si está activa y cuándo vence su prueba de vida. " +
      "No devuelve nada del documento: el nullifier no es reversible.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string" } },
      required: ["address"],
      additionalProperties: false,
    },
  },
  {
    name: "subi_contracts",
    description: "Direcciones de los contratos de SUBI en Celo mainnet y datos de la red.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "subi_build_deposit",
    description:
      "Arma las transacciones SIN FIRMAR para aportar al treasury: el approve del token y el " +
      "deposit. Devuelve to/data/value para que las firme una billetera. No firma ni envía nada.",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "string", description: 'Monto en unidades humanas, ej "0.5"' },
        attribution: { type: "string", description: "Texto de atribución que queda on-chain" },
      },
      required: ["amount"],
      additionalProperties: false,
    },
  },
  {
    name: "subi_build_claim",
    description:
      "Arma la transacción SIN FIRMAR para cobrar el dividendo acumulado. " +
      "Avisa si la dirección no está en el padrón o si no tiene nada para cobrar.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string", description: "Dirección que va a firmar" } },
      required: ["address"],
      additionalProperties: false,
    },
  },
];

/* ============================================================
   Implementación
   ============================================================ */
async function run(name: string, args: Record<string, any>) {
  const p = provider();

  switch (name) {
    case "subi_status": {
      const d = new ethers.Contract(C.distributor, ABI.distributor, p);
      const r = new ethers.Contract(C.registry, ABI.registry, p);
      const t = new ethers.Contract(C.treasury, ABI.treasury, p);

      const crudos = await Promise.all([
        d.distributable(), r.activeCount(), t.balance(), t.totalDeposited(), d.drawRateBps(),
      ]);
      const [distribuible, activos, saldoTreasury, totalAportado, drawRate] =
        crudos.map((v) => BigInt(v)) as [bigint, bigint, bigint, bigint, bigint];

      const anual = (distribuible * drawRate) / 10000n;
      const porPersonaDia =
        activos > 0n ? Number(ethers.formatUnits(anual, DEC)) / Number(activos) / 365 : 0;

      return {
        red: "Celo mainnet (42220)",
        treasury: `${fmt(saldoTreasury)} USDT`,
        totalAportadoHistorico: `${fmt(totalAportado)} USDT`,
        distribuible: `${fmt(distribuible)} USDT`,
        personasEnElPadron: activos.toString(),
        tasaDeGiroAnual: `${Number(drawRate) / 100}%`,
        dividendoPorPersonaPorDia:
          activos > 0n ? `${porPersonaDia.toFixed(6)} USDT` : "sin padrón todavía",
      };
    }

    case "subi_claimable": {
      const addr = ethers.getAddress(args.address);
      const d = new ethers.Contract(C.distributor, ABI.distributor, p);
      const r = new ethers.Contract(C.registry, ABI.registry, p);
      const [montoRaw, activo] = await Promise.all([d.claimable(addr), r.isActive(addr)]);
      const monto = BigInt(montoRaw);
      return {
        direccion: addr,
        enElPadron: activo,
        cobrableAhora: `${fmt(monto)} USDT`,
        nota: activo
          ? "El dividendo sigue acumulando; cobrar cuesta lo mismo se espere lo que se espere."
          : "La dirección no está en el padrón, así que no acumula nada.",
      };
    }

    case "subi_registration": {
      const addr = ethers.getAddress(args.address);
      const r = new ethers.Contract(C.registry, ABI.registry, p);
      const [activo, reg] = await Promise.all([r.isActive(addr), r.registrations(addr)]);
      const vence = Number(reg.expiration);
      return {
        direccion: addr,
        activo,
        registrado: BigInt(reg.nullifier) !== 0n,
        pruebaDeVidaVence: vence ? new Date(vence * 1000).toISOString() : null,
        nota: "El nullifier identifica al documento sin revelarlo y no se expone acá.",
      };
    }

    case "subi_contracts":
      return {
        red: { nombre: "Celo mainnet", chainId: 42220, rpc: "https://forno.celo.org" },
        contratos: C,
        activo: { direccion: ASSET, simbolo: deployment.assetSymbol ?? "USDT", decimales: DEC },
        verificacionDeIdentidad: {
          proveedor: "Self",
          hub: (deployment as any).selfHub ?? null,
          nota: "El alta en el padrón sólo ocurre tras una prueba ZK validada por el hub.",
        },
        explorador: "https://celoscan.io",
      };

    case "subi_build_deposit": {
      const monto = ethers.parseUnits(String(args.amount), DEC);
      if (monto <= 0n) throw new Error("El monto tiene que ser mayor que cero.");
      const atribucion = String(args.attribution ?? "");

      const erc20 = new ethers.Interface(ABI.erc20);
      const treasury = new ethers.Interface(ABI.treasury);

      return {
        aviso: "Transacciones SIN FIRMAR. Revisalas y firmalas con tu billetera.",
        pasos: [
          {
            paso: 1,
            descripcion: `Autorizar al treasury a mover ${args.amount} USDT`,
            to: ASSET,
            data: erc20.encodeFunctionData("approve", [C.treasury, monto]),
            value: "0x0",
            feeCurrency: ASSET,
          },
          {
            paso: 2,
            descripcion: `Aportar ${args.amount} USDT al treasury`,
            to: C.treasury,
            data: treasury.encodeFunctionData("deposit", [monto, atribucion]),
            value: "0x0",
            feeCurrency: ASSET,
          },
        ],
        nota:
          "Las dos transacciones llevan feeCurrency (CIP-64), así que el gas se paga en el " +
          "mismo USDT que se aporta y no hace falta tener CELO. Una billetera que no soporte " +
          "CIP-64 puede ignorar el campo y pagar en CELO.",
      };
    }

    case "subi_build_claim": {
      const addr = ethers.getAddress(args.address);
      const d = new ethers.Contract(C.distributor, ABI.distributor, p);
      const r = new ethers.Contract(C.registry, ABI.registry, p);
      const [activo, montoRaw] = await Promise.all([r.isActive(addr), d.claimable(addr)]);
      const monto = BigInt(montoRaw);

      if (!activo) {
        return { error: "La dirección no está en el padrón: primero hay que verificarse con Self." };
      }
      if (monto === 0n) {
        return { error: "No hay nada acumulado para cobrar todavía." };
      }

      return {
        aviso: "Transacción SIN FIRMAR. Revisala y firmala con tu billetera.",
        descripcion: `Cobrar ${fmt(monto)} USDT`,
        from: addr,
        to: C.distributor,
        data: new ethers.Interface(ABI.distributor).encodeFunctionData("claim", []),
        value: "0x0",
        // CIP-64: el gas sale del mismo USDT que se cobra, así que quien cobra
        // nunca necesita tener CELO. Es el punto entero del diseño.
        feeCurrency: ASSET,
        nota:
          "Lleva feeCurrency (CIP-64): el gas se paga en el mismo USDT que se cobra. " +
          "Una billetera sin soporte CIP-64 puede ignorar el campo y pagar en CELO.",
      };
    }

    default:
      throw new Error(`Herramienta desconocida: ${name}`);
  }
}

/* ============================================================
   Transporte JSON-RPC
   ============================================================ */
const ok = (id: any, result: any) => NextResponse.json({ jsonrpc: "2.0", id, result });
const err = (id: any, code: number, message: string) =>
  NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return err(null, -32700, "JSON inválido");
  }

  const { id = null, method, params } = body ?? {};

  try {
    switch (method) {
      case "initialize":
        return ok(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "subi", version: "0.1.0" },
        });

      case "notifications/initialized":
        return new NextResponse(null, { status: 204 });

      case "tools/list":
        return ok(id, { tools: TOOLS });

      case "tools/call": {
        const result = await run(params?.name, params?.arguments ?? {});
        return ok(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      }

      case "ping":
        return ok(id, {});

      default:
        return err(id, -32601, `Método no soportado: ${method}`);
    }
  } catch (e: any) {
    // Los errores de una tool viajan como resultado con isError, no como error de protocolo:
    // así el cliente se los puede mostrar al modelo en vez de cortar la sesión.
    if (method === "tools/call") {
      return ok(id, {
        content: [{ type: "text", text: `Error: ${e?.message ?? String(e)}` }],
        isError: true,
      });
    }
    return err(id, -32603, e?.message ?? String(e));
  }
}

export async function GET() {
  return NextResponse.json({
    name: "subi",
    description: "MCP de SUBI: estado del padrón y del fondo, y transacciones sin firmar.",
    transport: "JSON-RPC 2.0 sobre POST",
    tools: TOOLS.map((t) => t.name),
    contracts: C,
  });
}
