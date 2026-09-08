import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SubiDistributor, SubiRegistry, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SubiDistributor", function () {
  let distributor: SubiDistributor;
  let registry: SubiRegistry;
  let asset: MockERC20;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;

  const DRAW_RATE_BPS = 400; // 4% annual (Alaska-style)
  const ONE_DAY = 86400;
  const ONE_YEAR = 365 * ONE_DAY;
  const PRECISION = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, alice, bob, carol] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    asset = await MockERC20Factory.deploy("USD Coin", "USDC", 6);

    // Orden correcto: distributor -> registry -> treasury -> cableado.
    // El setup anterior desplegaba el registry con el placeholder 0x…01 y luego
    // redesplegaba ambos, dejando al registry apuntando a un distributor
    // descartado. Con eso el hook onRegister nunca se ejecutaba y los bugs de
    // orden y de contabilidad quedaban invisibles.
    const SubiDistributorFactory = await ethers.getContractFactory("SubiDistributor");
    distributor = await SubiDistributorFactory.deploy(
      await asset.getAddress(),
      DRAW_RATE_BPS
    );

    const SubiRegistryFactory = await ethers.getContractFactory("SubiRegistry");
    registry = await SubiRegistryFactory.deploy();

    const SubiTreasuryFactory = await ethers.getContractFactory("SubiTreasury");
    const treasury = await SubiTreasuryFactory.deploy(
      await asset.getAddress(),
      owner.address
    );

    await registry.setDistributor(await distributor.getAddress());
    await treasury.setDistributor(await distributor.getAddress());
    await distributor.wire(
      await registry.getAddress(),
      await treasury.getAddress()
    );
  });

  describe("Initialization", function () {
    it("Should set the correct parameters", async function () {
      expect(await distributor.asset()).to.equal(await asset.getAddress());
      expect(await distributor.registry()).to.equal(await registry.getAddress());
      expect(await distributor.drawRateBps()).to.equal(DRAW_RATE_BPS);
    });

    it("Should reject draw rate above maximum", async function () {
      const SubiDistributorFactory = await ethers.getContractFactory("SubiDistributor");
      await expect(
        SubiDistributorFactory.deploy(
          await asset.getAddress(),
          1001 // 10.01% > 10% max
        )
      ).to.be.revertedWithCustomError(distributor, "DrawRateTooHigh");
    });
  });

  describe("Distribution Math", function () {
    beforeEach(async function () {
      // Fund the distributor
      await asset.mint(await distributor.getAddress(), ethers.parseUnits("1000000", 6)); // 1M USDC

      // Register Alice
      await registry.connect(alice).register(ethers.id("alice-nullifier"));
    });

    it("Should calculate distributable correctly", async function () {
      const balance = await asset.balanceOf(await distributor.getAddress());
      const accruedUnclaimed = await distributor.accruedUnclaimed();
      const distributableAmount = await distributor.distributable();
      
      expect(distributableAmount).to.equal(balance - accruedUnclaimed);
    });

    it("Should accrue correctly over one day with one human", async function () {
      const initialBalance = await asset.balanceOf(await distributor.getAddress());
      
      // Advance 1 day
      await time.increase(ONE_DAY);
      await distributor.accrue();

      const accruedUnclaimed = await distributor.accruedUnclaimed();
      
      // Expected: (1M * 400bps * 1day) / (10000bps * 365days)
      // = (1000000 * 400 * 1) / (10000 * 365)
      // = 109.589... USDC per day
      const expectedDaily = (initialBalance * BigInt(DRAW_RATE_BPS)) / (BigInt(10000) * BigInt(365));
      
      expect(accruedUnclaimed).to.be.closeTo(expectedDaily, ethers.parseUnits("1", 6)); // Within 1 USDC tolerance
    });

    it("Should distribute evenly among multiple humans", async function () {
      // Register Bob and Carol
      await registry.connect(bob).register(ethers.id("bob-nullifier"));
      await registry.connect(carol).register(ethers.id("carol-nullifier"));

      const activeCount = await registry.activeCount();
      expect(activeCount).to.equal(3);

      // Advance 1 day
      await time.increase(ONE_DAY);
      await distributor.accrue();

      const claimableAlice = await distributor.claimable(alice.address);
      const claimableBob = await distributor.claimable(bob.address);
      const claimableCarol = await distributor.claimable(carol.address);

      // All should have equal amounts (within rounding)
      expect(claimableAlice).to.be.closeTo(claimableBob, ethers.parseUnits("0.01", 6));
      expect(claimableBob).to.be.closeTo(claimableCarol, ethers.parseUnits("0.01", 6));
    });

    it("Should maintain solvency (never distribute more than available)", async function () {
      const initialBalance = await asset.balanceOf(await distributor.getAddress());

      // Advance 1 year
      await time.increase(ONE_YEAR);
      await distributor.accrue();

      const accruedUnclaimed = await distributor.accruedUnclaimed();
      
      // Accrued should be approximately 4% of initial balance
      const expectedYearly = (initialBalance * BigInt(DRAW_RATE_BPS)) / BigInt(10000);
      
      expect(accruedUnclaimed).to.be.closeTo(expectedYearly, ethers.parseUnits("100", 6));
      expect(accruedUnclaimed).to.be.lte(initialBalance);
    });

    it("Should handle O(1) claims regardless of time elapsed", async function () {
      // Advance 30 days without claiming
      await time.increase(30 * ONE_DAY);

      // Claim should work in O(1) time
      await expect(distributor.connect(alice).claim())
        .to.emit(distributor, "Claimed");

      const balance = await asset.balanceOf(alice.address);
      expect(balance).to.be.gt(0);
    });

    it("Should carry forward fractional amounts", async function () {
      // Small deposit to test fractional handling
      const smallAmount = ethers.parseUnits("1", 6); // 1 USDC
      
      // Clear previous balance and add small amount
      await asset.mint(owner.address, smallAmount);
      await asset.transfer(await distributor.getAddress(), smallAmount);

      // Advance small time
      await time.increase(1); // 1 second
      await distributor.accrue();

      const claimable1 = await distributor.claimable(alice.address);
      
      // Advance another second
      await time.increase(1);
      const claimable2 = await distributor.claimable(alice.address);

      // Should accumulate (not lose fractional parts)
      expect(claimable2).to.be.gte(claimable1);
    });
  });

  describe("Registry Integration", function () {
    beforeEach(async function () {
      await asset.mint(await distributor.getAddress(), ethers.parseUnits("100000", 6));
    });

    it("Should prevent unverified humans from claiming", async function () {
      await expect(
        distributor.connect(alice).claim()
      ).to.be.revertedWithCustomError(distributor, "NotVerified");
    });

    it("Should allow verified humans to claim", async function () {
      await registry.connect(alice).register(ethers.id("alice-nullifier"));
      
      await time.increase(ONE_DAY);
      await distributor.accrue();

      await expect(distributor.connect(alice).claim())
        .to.emit(distributor, "Claimed");
    });

    it("Should handle deregistration correctly", async function () {
      await registry.connect(alice).register(ethers.id("alice-nullifier"));
      
      await time.increase(ONE_DAY);
      await distributor.accrue();

      const claimableBefore = await distributor.claimable(alice.address);
      
      // Deregister
      await registry.connect(alice).deregister();

      // Should no longer be able to claim new accruals
      await time.increase(ONE_DAY);
      
      // But old balance should be preserved if they re-register
      expect(claimableBefore).to.be.gt(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero active humans", async function () {
      await time.increase(ONE_DAY);
      await distributor.accrue();

      expect(await distributor.accruedUnclaimed()).to.equal(0);
    });

    it("Should handle zero balance", async function () {
      await registry.connect(alice).register(ethers.id("alice-nullifier"));
      
      await time.increase(ONE_DAY);
      await distributor.accrue();

      expect(await distributor.accruedUnclaimed()).to.equal(0);
    });

    it("Should prevent claiming when nothing is owed", async function () {
      // Sin fondo no hay devengo, y ahí sí no hay nada que cobrar.
      // (Con fondo, el segundo que separa dos bloques ya devenga algo:
      // el reparto es continuo, así que "reclamar en el acto" no existe.)
      await registry.connect(alice).register(ethers.id("alice-nullifier"));

      await expect(
        distributor.connect(alice).claim()
      ).to.be.revertedWithCustomError(distributor, "NothingToClaim");
    });

    it("Should handle multiple accruals between claims", async function () {
      await asset.mint(await distributor.getAddress(), ethers.parseUnits("100000", 6));
      await registry.connect(alice).register(ethers.id("alice-nullifier"));

      // Multiple accrual calls
      await time.increase(ONE_DAY);
      await distributor.accrue();
      await time.increase(ONE_DAY);
      await distributor.accrue();
      await time.increase(ONE_DAY);
      await distributor.accrue();

      // Should accumulate correctly
      const claimable = await distributor.claimable(alice.address);
      expect(claimable).to.be.gt(0);

      await distributor.connect(alice).claim();
      const balance = await asset.balanceOf(alice.address);
      // claimable se leyó un bloque antes del claim: el tiempo solo avanza,
      // así que lo cobrado es igual o un poco mayor, nunca menor.
      expect(balance).to.be.gte(claimable);
    });
  });

  describe("Governance", function () {
    it("Should allow owner to change draw rate", async function () {
      const newRate = 500; // 5%
      
      await expect(distributor.connect(owner).setDrawRate(newRate))
        .to.emit(distributor, "DrawRateSet")
        .withArgs(DRAW_RATE_BPS, newRate);

      expect(await distributor.drawRateBps()).to.equal(newRate);
    });

    it("Should prevent non-owner from changing draw rate", async function () {
      await expect(
        distributor.connect(alice).setDrawRate(500)
      ).to.be.revertedWithCustomError(distributor, "OnlyOwner");
    });

    it("Should prevent setting draw rate above maximum", async function () {
      await expect(
        distributor.connect(owner).setDrawRate(1001)
      ).to.be.revertedWithCustomError(distributor, "DrawRateTooHigh");
    });
  });
});
