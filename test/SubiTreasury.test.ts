import { expect } from "chai";
import { ethers } from "hardhat";
import { SubiTreasury, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SubiTreasury", function () {
  let treasury: SubiTreasury;
  let asset: MockERC20;
  let owner: SignerWithAddress;
  let distributor: SignerWithAddress;
  let contributor1: SignerWithAddress;
  let contributor2: SignerWithAddress;

  beforeEach(async function () {
    [owner, distributor, contributor1, contributor2] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    asset = await MockERC20Factory.deploy("USD Coin", "USDC", 6);

    // Deploy treasury
    const SubiTreasuryFactory = await ethers.getContractFactory("SubiTreasury");
    treasury = await SubiTreasuryFactory.deploy(
      await asset.getAddress(),
      owner.address
    );

    // Set distributor
    await treasury.setDistributor(distributor.address);
  });

  describe("Deposits", function () {
    it("Should accept deposits from anyone", async function () {
      const amount = ethers.parseUnits("1000", 6);
      await asset.mint(contributor1.address, amount);
      await asset.connect(contributor1).approve(await treasury.getAddress(), amount);

      await expect(
        treasury.connect(contributor1).deposit(amount, "SpaceX - Starlink revenue")
      ).to.emit(treasury, "Deposited")
        .withArgs(contributor1.address, amount, "SpaceX - Starlink revenue");

      expect(await treasury.contributions(contributor1.address)).to.equal(amount);
      expect(await treasury.totalDeposited()).to.equal(amount);
      expect(await treasury.balance()).to.equal(amount);
    });

    it("Should track multiple contributors", async function () {
      const amount1 = ethers.parseUnits("1000", 6);
      const amount2 = ethers.parseUnits("2000", 6);

      await asset.mint(contributor1.address, amount1);
      await asset.connect(contributor1).approve(await treasury.getAddress(), amount1);
      await treasury.connect(contributor1).deposit(amount1, "Contributor 1");

      await asset.mint(contributor2.address, amount2);
      await asset.connect(contributor2).approve(await treasury.getAddress(), amount2);
      await treasury.connect(contributor2).deposit(amount2, "Contributor 2");

      expect(await treasury.contributions(contributor1.address)).to.equal(amount1);
      expect(await treasury.contributions(contributor2.address)).to.equal(amount2);
      expect(await treasury.totalDeposited()).to.equal(amount1 + amount2);
    });

    it("Should accumulate multiple deposits from same contributor", async function () {
      const amount = ethers.parseUnits("1000", 6);
      
      await asset.mint(contributor1.address, amount * 2n);
      await asset.connect(contributor1).approve(await treasury.getAddress(), amount * 2n);

      await treasury.connect(contributor1).deposit(amount, "First deposit");
      await treasury.connect(contributor1).deposit(amount, "Second deposit");

      expect(await treasury.contributions(contributor1.address)).to.equal(amount * 2n);
    });

    it("Should reject zero deposits", async function () {
      await expect(
        treasury.connect(contributor1).deposit(0, "Zero deposit")
      ).to.be.revertedWithCustomError(treasury, "ZeroAmount");
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      const amount = ethers.parseUnits("10000", 6);
      await asset.mint(contributor1.address, amount);
      await asset.connect(contributor1).approve(await treasury.getAddress(), amount);
      await treasury.connect(contributor1).deposit(amount, "Initial funding");
    });

    it("Should allow distributor to withdraw", async function () {
      const amount = ethers.parseUnits("1000", 6);
      
      await expect(
        treasury.connect(distributor).withdraw(distributor.address, amount)
      ).to.emit(treasury, "Withdrawn")
        .withArgs(distributor.address, amount);

      expect(await asset.balanceOf(distributor.address)).to.equal(amount);
    });

    it("Should prevent non-distributor from withdrawing", async function () {
      const amount = ethers.parseUnits("1000", 6);
      
      await expect(
        treasury.connect(contributor1).withdraw(contributor1.address, amount)
      ).to.be.revertedWithCustomError(treasury, "OnlyDistributor");
    });

    it("Should reject zero withdrawals", async function () {
      await expect(
        treasury.connect(distributor).withdraw(distributor.address, 0)
      ).to.be.revertedWithCustomError(treasury, "ZeroAmount");
    });
  });

  describe("Attribution", function () {
    it("Should preserve attribution strings", async function () {
      const amount = ethers.parseUnits("5000", 6);
      await asset.mint(contributor1.address, amount);
      await asset.connect(contributor1).approve(await treasury.getAddress(), amount);

      const attribution = "Blue Origin - New Glenn commercial launches Q1 2027";
      
      const tx = await treasury.connect(contributor1).deposit(amount, attribution);
      const receipt = await tx.wait();
      
      // Check event emitted with correct attribution
      const event = receipt?.logs.find(
        log => treasury.interface.parseLog(log as any)?.name === "Deposited"
      );
      
      expect(event).to.not.be.undefined;
    });
  });

  describe("Governance", function () {
    it("Should allow owner to change distributor", async function () {
      const newDistributor = contributor1.address;
      
      await expect(treasury.setDistributor(newDistributor))
        .to.emit(treasury, "DistributorSet")
        .withArgs(newDistributor);

      expect(await treasury.distributor()).to.equal(newDistributor);
    });

    it("Should prevent non-owner from changing distributor", async function () {
      await expect(
        treasury.connect(contributor1).setDistributor(contributor1.address)
      ).to.be.reverted;
    });

    it("Should allow owner to transfer ownership", async function () {
      await treasury.transferOwnership(contributor1.address);
      expect(await treasury.owner()).to.equal(contributor1.address);
    });
  });
});
