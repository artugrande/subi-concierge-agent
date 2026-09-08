import { expect } from "chai";
import { toDataSuffix } from "@celo/attribution-tags";
import { AGENT_CONFIG } from "../config";
import { 
  withAttribution, 
  addAttributionToTx,
  getAttributionInfo 
} from "../utils/attribution";
import {
  buildClaimUBITransaction,
  buildPledgeUBITransaction,
  buildTransferTransaction,
  buildContractCallTransaction
} from "../agent/transactions";
import { ethers } from "ethers";

describe("Attribution Tags", function () {
  const expectedSuffix = toDataSuffix(AGENT_CONFIG.ATTRIBUTION_TAG);

  describe("withAttribution", function () {
    it("should append attribution to empty data", function () {
      const result = withAttribution("0x");
      expect(result).to.equal("0x" + expectedSuffix);
    });

    it("should append attribution to contract call data", function () {
      const originalData = "0xa9059cbb000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f0beb0";
      const result = withAttribution(originalData);
      expect(result).to.include(originalData.slice(2));
      expect(result).to.include(expectedSuffix);
    });

    it("should handle data without 0x prefix", function () {
      const originalData = "a9059cbb";
      const result = withAttribution(originalData);
      expect(result).to.equal("0x" + originalData + expectedSuffix);
    });
  });

  describe("addAttributionToTx", function () {
    it("should add attribution to transaction with data", function () {
      const tx = {
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        data: "0xa9059cbb",
        value: 0n,
      };

      const result = addAttributionToTx(tx);
      expect(result.data).to.include("a9059cbb");
      expect(result.data).to.include(expectedSuffix);
    });

    it("should add attribution to transaction without data", function () {
      const tx = {
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        value: 100n,
      };

      const result = addAttributionToTx(tx);
      expect(result.data).to.equal("0x" + expectedSuffix);
    });
  });

  describe("getAttributionInfo", function () {
    it("should return correct attribution info", function () {
      const info = getAttributionInfo();
      expect(info.tag).to.equal("celo_ac17e664a585");
      expect(info.agentId).to.equal("9822");
      expect(info.agentWallet).to.equal("0x35422f585e1f570515147E557aEF8fD6a6e1b3b3");
    });
  });

  describe("Transaction Builders", function () {
    it("buildClaimUBITransaction should include attribution", function () {
      const tx = buildClaimUBITransaction(
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        ethers.parseEther("10")
      );

      expect(tx.data).to.be.a("string");
      expect(tx.data).to.include(expectedSuffix);
    });

    it("buildPledgeUBITransaction should include attribution", function () {
      const tx = buildPledgeUBITransaction(
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        "0x1234567890123456789012345678901234567890",
        ethers.parseEther("5")
      );

      expect(tx.data).to.be.a("string");
      expect(tx.data).to.include(expectedSuffix);
    });

    it("buildTransferTransaction should include attribution", function () {
      const tx = buildTransferTransaction(
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        ethers.parseEther("1")
      );

      expect(tx.data).to.be.a("string");
      expect(tx.data).to.include(expectedSuffix);
    });

    it("buildContractCallTransaction should include attribution", function () {
      const tx = buildContractCallTransaction(
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        "transfer(address,uint256)",
        ["0x1234567890123456789012345678901234567890", ethers.parseEther("1")],
        0n
      );

      expect(tx.data).to.be.a("string");
      expect(tx.data).to.include(expectedSuffix);
    });

    it("all transaction types should have consistent attribution", function () {
      const transactions = [
        buildClaimUBITransaction("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0", 100n),
        buildPledgeUBITransaction("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0", "0x1234567890123456789012345678901234567890", 100n),
        buildTransferTransaction("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0", 100n),
        buildContractCallTransaction("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0", "test()", [], 0n),
      ];

      transactions.forEach((tx) => {
        expect(tx.data).to.be.a("string");
        expect(tx.data).to.include(expectedSuffix);
      });
    });
  });

  describe("Configuration", function () {
    it("should have the correct attribution tag", function () {
      expect(AGENT_CONFIG.ATTRIBUTION_TAG).to.equal("celo_ac17e664a585");
    });

    it("should have the correct agent ID", function () {
      expect(AGENT_CONFIG.AGENT_ID).to.equal("9822");
    });

    it("should have the correct agent wallet", function () {
      expect(AGENT_CONFIG.AGENT_WALLET_ADDRESS).to.equal("0x35422f585e1f570515147E557aEF8fD6a6e1b3b3");
    });
  });
});
