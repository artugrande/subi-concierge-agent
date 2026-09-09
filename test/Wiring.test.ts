import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Regresión del cableado entre registry, treasury y distributor.
 *
 * Cada bloque de acá reproduce un fallo que estaba en producción en Celo mainnet
 * el 2026-09-08 y que la suite anterior no detectaba, porque fondeaba al
 * distributor directamente con `asset.mint(distributor)` y porque su propio
 * `beforeEach` desplegaba el registry con el placeholder 0x…01.
 */
describe("Cableado registry / treasury / distributor", function () {
  const DRAW_RATE_BPS = 400; // 4% anual
  const ONE_DAY = 86400;
  const SEED = ethers.parseUnits("1000", 6); // 1.000 USDC en el treasury

  async function deployWired() {
    const [owner, alice, bob] = await ethers.getSigners();

    const asset = await (await ethers.getContractFactory("MockERC20"))
      .deploy("USD Coin", "USDC", 6);

    // Orden correcto: distributor -> registry -> treasury -> cableado
    const distributor = await (await ethers.getContractFactory("SubiDistributor"))
      .deploy(await asset.getAddress(), DRAW_RATE_BPS);

    const registry = await (await ethers.getContractFactory("SubiRegistry")).deploy();

    const treasury = await (await ethers.getContractFactory("SubiTreasury"))
      .deploy(await asset.getAddress(), owner.address);

    await registry.setDistributor(await distributor.getAddress());
    await treasury.setDistributor(await distributor.getAddress());
    await distributor.wire(await registry.getAddress(), await treasury.getAddress());

    // El dinero entra por el treasury, como en la vida real
    await asset.mint(owner.address, SEED);
    await asset.approve(await treasury.getAddress(), SEED);
    await treasury.deposit(SEED, "seed de la demo");

    return { owner, alice, bob, asset, distributor, registry, treasury };
  }

  it("el registry queda apuntando al distributor, no a un placeholder", async function () {
    const { registry, distributor } = await deployWired();
    expect(await registry.distributor()).to.equal(await distributor.getAddress());
    expect(await registry.distributor()).to.not.equal(
      "0x0000000000000000000000000000000000000001"
    );
  });

  it("el cableado es de una sola vez", async function () {
    const { registry, distributor, treasury, alice } = await deployWired();
    await expect(registry.setDistributor(alice.address)).to.be.revertedWithCustomError(
      registry, "AlreadyWired"
    );
    await expect(
      distributor.wire(await registry.getAddress(), await treasury.getAddress())
    ).to.be.revertedWithCustomError(distributor, "AlreadyWired");
  });

  it("los fondos del treasury cuentan como distribuibles", async function () {
    const { distributor, treasury, asset } = await deployWired();

    // El bug: el distributor no tiene nada propio y aun así hay fondo repartible
    expect(await asset.balanceOf(await distributor.getAddress())).to.equal(0n);
    expect(await treasury.balance()).to.equal(SEED);
    expect(await distributor.distributable()).to.equal(SEED);
  });

  it("una persona registrada puede cobrar, con la plata en el treasury", async function () {
    const { distributor, registry, treasury, asset, alice } = await deployWired();

    await registry.connect(alice).register(ethers.id("alice"));
    await time.increase(30 * ONE_DAY);

    const claimable = await distributor.claimable(alice.address);
    expect(claimable).to.be.gt(0n);

    const antes = await asset.balanceOf(alice.address);
    await distributor.connect(alice).claim();
    const cobrado = (await asset.balanceOf(alice.address)) - antes;

    expect(cobrado).to.be.gt(0n);
    // el distributor tira del treasury solo lo necesario
    expect(await treasury.balance()).to.equal(SEED - cobrado);
  });

  it("registrarse no diluye el período anterior de los que ya estaban", async function () {
    const { distributor, registry, alice, bob } = await deployWired();

    await registry.connect(alice).register(ethers.id("alice"));
    await time.increase(30 * ONE_DAY);

    // Lo devengado por alice hasta acá es suyo: bob no puede licuarlo al entrar.
    const antesDeBob = await distributor.claimable(alice.address);
    await registry.connect(bob).register(ethers.id("bob"));
    const despuesDeBob = await distributor.claimable(alice.address);

    expect(despuesDeBob).to.be.gte(antesDeBob);
    // y bob arranca de cero, sin llevarse nada del histórico
    expect(await distributor.claimable(bob.address)).to.equal(0n);
  });

  it("darse de baja devuelve lo no cobrado al pool en lugar de trabarlo", async function () {
    const { distributor, registry, alice } = await deployWired();

    await registry.connect(alice).register(ethers.id("alice"));
    await time.increase(30 * ONE_DAY);
    await distributor.accrue();

    const trabado = await distributor.accruedUnclaimed();
    expect(trabado).to.be.gt(0n);

    await registry.connect(alice).deregister();

    // sin el arreglo, `accruedUnclaimed` se quedaba con el saldo para siempre
    expect(await distributor.accruedUnclaimed()).to.equal(0n);
  });

  it("volver a registrarse no deja fondos inreclamables", async function () {
    const { distributor, registry, alice } = await deployWired();

    await registry.connect(alice).register(ethers.id("alice"));
    await time.increase(30 * ONE_DAY);
    await registry.connect(alice).deregister();
    await time.increase(31 * ONE_DAY); // pasa el cooldown de rebindeo
    await registry.connect(alice).register(ethers.id("alice"));

    // el contador y la contabilidad quedan consistentes
    expect(await registry.activeCount()).to.equal(1n);
    expect(await distributor.claimable(alice.address)).to.equal(0n);
  });

  it("sin cablear, claim revierte en lugar de fallar silencioso", async function () {
    const [, alice] = await ethers.getSigners();
    const asset = await (await ethers.getContractFactory("MockERC20"))
      .deploy("USD Coin", "USDC", 6);
    const distributor = await (await ethers.getContractFactory("SubiDistributor"))
      .deploy(await asset.getAddress(), DRAW_RATE_BPS);

    await expect(distributor.connect(alice).claim())
      .to.be.revertedWithCustomError(distributor, "NotWired");
  });
});
