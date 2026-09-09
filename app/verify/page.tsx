"use client";

/**
 * Verificación de identidad con Self, contra el SubiRegistry de Celo mainnet.
 *
 * El scope que codifica este QR se deriva de (dirección del registry, semilla) con
 * Poseidon, y tiene que dar exactamente el mismo número que devuelve `scope()` en el
 * contrato. Si no coincide, el hub rechaza la prueba y el escaneo se pierde. Por eso
 * la página compara los dos valores antes de mostrar el QR y avisa si difieren.
 *
 * Con `endpointType: "celo"` el endpoint es el contrato, no un backend nuestro: la
 * prueba la sube el relayer de Self y el hub llama a `customVerificationHook`. Esta
 * página no firma nada ni necesita servidor.
 */

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { SelfAppBuilder, SelfQRcodeWrapper, getUniversalLink } from "@selfxyz/qrcode";
import { hashEndpointWithScope } from "@selfxyz/common";
import deployment from "../../deployment-mainnet.json";

const REGISTRY = deployment.contracts.registry;
const SCOPE_SEED = "subi-space";
const EDAD_MINIMA = 18;
const RPC = "https://forno.celo.org";

const ABI = [
  "function scope() view returns (uint256)",
  "function activeCount() view returns (uint256)",
  "function isActive(address) view returns (bool)",
  "function registrations(address) view returns (uint256 nullifier, uint256 expiration, uint256 unbindTime)",
];

export default function Verify() {
  const [direccion, setDireccion] = useState("");
  const [scopeCadena, setScopeCadena] = useState<string | null>(null);
  const [padron, setPadron] = useState<number | null>(null);
  const [registrado, setRegistrado] = useState<boolean | null>(null);
  const [nullifier, setNullifier] = useState<string | null>(null);

  const provider = useMemo(() => new ethers.JsonRpcProvider(RPC), []);
  const registry = useMemo(() => new ethers.Contract(REGISTRY, ABI, provider), [provider]);

  const scopeEsperado = useMemo(() => {
    try {
      return hashEndpointWithScope(REGISTRY, SCOPE_SEED).toString();
    } catch {
      return null;
    }
  }, []);

  const valida = ethers.isAddress(direccion);

  // Estado del padrón, y de esta dirección en particular.
  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      try {
        const [s, c] = await Promise.all([registry.scope(), registry.activeCount()]);
        if (!vivo) return;
        setScopeCadena(s.toString());
        setPadron(Number(c));
        if (valida) {
          const [act, reg] = await Promise.all([
            registry.isActive(direccion),
            registry.registrations(direccion),
          ]);
          if (!vivo) return;
          setRegistrado(act);
          setNullifier(reg[0] === 0n ? null : reg[0].toString());
        } else {
          setRegistrado(null);
          setNullifier(null);
        }
      } catch {
        /* el RPC puede fallar puntualmente; se reintenta en el próximo tick */
      }
    };
    leer();
    const t = setInterval(leer, 6000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [registry, direccion, valida]);

  const scopeCoincide = scopeCadena !== null && scopeEsperado !== null && scopeCadena === scopeEsperado;

  const selfApp = useMemo(() => {
    if (!valida || !scopeCoincide) return null;
    return new SelfAppBuilder({
      appName: "SUBI",
      scope: SCOPE_SEED,
      endpoint: REGISTRY.toLowerCase(),
      endpointType: "celo",
      userId: direccion.toLowerCase(),
      userIdType: "hex",
      version: 2,
      chainID: 42220,
      devMode: false,
      logoBase64: "",
      disclosures: { minimumAge: EDAD_MINIMA },
      userDefinedData: "",
    }).build();
  }, [valida, scopeCoincide, direccion]);

  const link = selfApp ? getUniversalLink(selfApp) : null;

  return (
    <main className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify with Self</h1>
      <p className="text-gray-600 mb-8">
        Prove you are a unique human and join the SUBI register on Celo mainnet. The proof is
        generated on your phone; your document never leaves it.
      </p>

      <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-gray-500">Registry</span>
          <code className="text-gray-900">{REGISTRY.slice(0, 10)}…{REGISTRY.slice(-6)}</code>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-gray-500">People in the register</span>
          <span className="font-semibold text-gray-900">{padron ?? "…"}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-gray-500">Scope matches the contract</span>
          <span className={scopeCoincide ? "text-green-600 font-semibold" : "text-amber-600"}>
            {scopeCadena === null ? "checking…" : scopeCoincide ? "yes" : "NO"}
          </span>
        </div>
      </div>

      {scopeCadena !== null && !scopeCoincide && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-5 mb-6 text-sm text-red-800">
          <strong>Do not scan.</strong> The scope this page derives does not match the one the
          deployed contract reports, so the hub would reject the proof. Expected{" "}
          <code className="break-all">{scopeEsperado}</code>, chain says{" "}
          <code className="break-all">{scopeCadena}</code>.
        </div>
      )}

      <label className="block text-sm font-medium text-gray-700 mb-2">
        Address to register
      </label>
      <input
        value={direccion}
        onChange={(e) => setDireccion(e.target.value.trim())}
        placeholder="0x…"
        spellCheck={false}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm mb-2"
      />
      {direccion && !valida && (
        <p className="text-sm text-amber-600 mb-4">That is not a valid address.</p>
      )}

      {registrado === true && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-5 my-6">
          <p className="font-semibold text-green-800 mb-1">Already in the register.</p>
          <p className="text-sm text-green-700">
            Nullifier <code className="break-all">{nullifier}</code>
          </p>
          <p className="text-sm text-green-700 mt-2">
            The dividend accrues from here. Claiming is a separate transaction.
          </p>
        </div>
      )}

      {selfApp && registrado === false && (
        <div className="my-8 flex flex-col items-center">
          <SelfQRcodeWrapper
            selfApp={selfApp}
            onSuccess={() => {
              /* la página ya relee el contrato cada 6 s, que es la fuente de verdad */
            }}
            onError={() => {}}
          />
          <p className="text-sm text-gray-600 mt-4 text-center">
            Scan with the Self app. On a phone, open the link directly:
          </p>
          {link && (
            <a href={link} className="text-sm text-blue-600 underline break-all mt-2 text-center">
              {link.slice(0, 72)}…
            </a>
          )}
          <p className="text-xs text-gray-500 mt-4 text-center max-w-sm">
            Minimum age {EDAD_MINIMA}. No country restrictions, no OFAC check. This page never sees
            your document and never signs anything: Self&apos;s hub submits the proof on-chain.
          </p>
        </div>
      )}

      {!direccion && (
        <p className="text-sm text-gray-500 mt-4">
          Paste the address you want the dividend paid to. The document you scan gets bound to it,
          and one document cannot hold two addresses.
        </p>
      )}
    </main>
  );
}
