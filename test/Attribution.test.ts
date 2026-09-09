import { expect } from "chai";
import { ethers } from "ethers";
import { AGENT_CONFIG } from "../config";
import {
  withAttribution,
  addAttributionToTx,
  attributionSuffix,
  decodeAttribution,
  getAttributionInfo,
} from "../utils/attribution";
import {
  buildClaimUBITransaction,
  buildPledgeUBITransaction,
  buildTransferTransaction,
  buildContractCallTransaction,
} from "../agent/transactions";

/**
 * Atribución ERC-8021.
 *
 * Esta suite no corría: `@celo/attribution-tags` es ESM puro y el runner es
 * CommonJS, así que el import estático rompía con ERR_REQUIRE_ESM antes de
 * ejecutar un solo caso. Al no correr nunca, tampoco se vio que afirmaba la
 * conducta equivocada: esperaba `"0x" + suffix` cuando el sufijo YA trae `0x`,
 * es decir daba por buena una calldata `0x0x63656c6f…`.
 */
describe("Attribution Tags", function () {
  let expectedSuffix: string;

  before(async function () {
    expectedSuffix = await attributionSuffix();
  });

  describe("formato del sufijo", function () {
    it("el sufijo viene con prefijo 0x", async function () {
      expect(await attributionSuffix()).to.equal(expectedSuffix);
      expect(expectedSuffix.startsWith("0x")).to.equal(true);
    });

    it("decodifica de vuelta al código del proyecto", async function () {
      const decoded = await decodeAttribution(expectedSuffix);
      expect(decoded.codes).to.include(AGENT_CONFIG.ATTRIBUTION_TAG);
    });
  });

  describe("withAttribution", function () {
    it("sobre data vacía produce hex válido, sin 0x duplicado", async function () {
      const result = await withAttribution("0x");
      expect(result).to.equal(expectedSuffix);
      expect(ethers.isHexString(result)).to.equal(true);
      expect(result.startsWith("0x0x")).to.equal(false);
    });

    it("conserva el calldata original y le anexa el sufijo", async function () {
      const original =
        "0xa9059cbb000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f0beb0";
      const result = await withAttribution(original);

      expect(ethers.isHexString(result)).to.equal(true);
      expect(result.startsWith(original)).to.equal(true);
      expect(result.endsWith(expectedSuffix.slice(2))).to.equal(true);
      expect(result.length).to.equal(original.length + expectedSuffix.length - 2);
    });

    it("acepta data sin prefijo", async function () {
      const sin = "a9059cbb";
      const result = await withAttribution(sin);
      expect(result).to.equal("0x" + sin + expectedSuffix.slice(2));
      expect(ethers.isHexString(result)).to.equal(true);
    });

    it("es idempotente en formato: aplicarlo dos veces sigue siendo hex válido", async function () {
      const una = await withAttribution("0xdeadbeef");
      const dos = await withAttribution(una);
      expect(ethers.isHexString(dos)).to.equal(true);
    });
  });

  describe("addAttributionToTx", function () {
    it("etiqueta el campo data y no toca el resto", async function () {
      const tx = { to: "0x0000000000000000000000000000000000000001", data: "0xdeadbeef", value: 7n };
      const out = await addAttributionToTx(tx);
      expect(out.to).to.equal(tx.to);
      expect(out.value).to.equal(7n);
      expect(out.data.startsWith("0xdeadbeef")).to.equal(true);
      expect(ethers.isHexString(out.data)).to.equal(true);
    });
  });

  describe("builders del agente", function () {
    const addr = "0x0000000000000000000000000000000000000002";
    const beneficiario = "0x0000000000000000000000000000000000000003";

    it("todas las transacciones que arma el agente llevan la etiqueta", async function () {
      const txs = [
        await buildClaimUBITransaction(addr, 1000n),
        await buildPledgeUBITransaction(addr, beneficiario, 1000n),
        await buildTransferTransaction(addr, 1n),
        await buildContractCallTransaction(addr, "foo()", []),
      ];

      for (const tx of txs) {
        expect(ethers.isHexString(tx.data), `data inválida: ${tx.data}`).to.equal(true);
        expect(tx.data.endsWith(expectedSuffix.slice(2))).to.equal(true);
      }
    });
  });

  describe("sobre una transacción real", function () {
    it("el sufijo sobrevive el viaje a la cadena y se puede decodificar del calldata", async function () {
      const hre = require("hardhat");
      const [signer] = await hre.ethers.getSigners();

      const asset = await (await hre.ethers.getContractFactory("MockERC20"))
        .deploy("USD Coin", "USDC", 6);
      await asset.waitForDeployment();

      const data = asset.interface.encodeFunctionData("mint", [signer.address, 1n]);
      const tx = await signer.sendTransaction({
        to: await asset.getAddress(),
        data: await withAttribution(data),
      });
      await tx.wait();

      // se relee de la cadena, no del objeto que armamos
      const enCadena = await hre.ethers.provider.getTransaction(tx.hash);
      expect(enCadena!.data.endsWith(expectedSuffix.slice(2))).to.equal(true);

      const decoded = await decodeAttribution(
        "0x" + enCadena!.data.slice(-(expectedSuffix.length - 2))
      );
      expect(decoded.codes).to.include(AGENT_CONFIG.ATTRIBUTION_TAG);

      // y la llamada surtió efecto igual: el sufijo no rompe el calldata
      expect(await asset.balanceOf(signer.address)).to.equal(1n);
    });
  });

  describe("getAttributionInfo", function () {
    it("expone el código asignado del programa", function () {
      expect(getAttributionInfo().tag).to.equal(AGENT_CONFIG.ATTRIBUTION_TAG);
    });
  });
});
