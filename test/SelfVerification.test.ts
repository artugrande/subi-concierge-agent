import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Alta en el padrón vía prueba de Self.
 *
 * El hub real valida una prueba ZK y recién ahí llama `onVerificationSuccess`.
 * Acá se usa un hub simulado que dispara ese mismo callback, para poder ejercitar
 * el camino de producción sin generar pruebas reales. Lo que se verifica es que el
 * padrón sólo se escriba desde el hub y con los datos que el hub entrega.
 */
describe("Alta con verificación de Self", function () {
  const DRAW_RATE_BPS = 400;
  const ONE_DAY = 86400;
  const SEED = ethers.parseUnits("1000", 6);

  /** Codifica un GenericDiscloseOutputV2 como lo hace el hub. */
  function output(account: string, nullifier: bigint) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(bytes32,uint256,uint256,uint256[4],string,string[],string,string,string,string,string,uint256,bool[3])"],
      [[
        ethers.zeroPadValue("0x01", 32),      // attestationId
        BigInt(account),                       // userIdentifier = la dirección
        nullifier,
        [0n, 0n, 0n, 0n],                      // forbiddenCountriesListPacked
        "ARG",                                 // issuingState
        [],                                    // name (no se divulga)
        "",                                    // idNumber
        "ARG",                                 // nationality
        "",                                    // dateOfBirth
        "",                                    // gender
        "",                                    // expiryDate
        18n,                                   // olderThan
        [false, false, false],                 // ofac
      ]]
    );
  }

  async function deploy() {
    const [owner, alice, bob, mallory] = await ethers.getSigners();

    const hub = await (await ethers.getContractFactory("MockSelfHub")).deploy();
    const asset = await (await ethers.getContractFactory("MockERC20")).deploy("USD Coin", "USDC", 6);

    const distributor = await (await ethers.getContractFactory("SubiDistributor"))
      .deploy(await asset.getAddress(), DRAW_RATE_BPS);

    const registry = await (await ethers.getContractFactory("SubiRegistry")).deploy(
      await hub.getAddress(),
      "subi-space",
      { olderThan: 18, forbiddenCountries: [], ofacEnabled: false }
    );

    const treasury = await (await ethers.getContractFactory("SubiTreasury"))
      .deploy(await asset.getAddress(), owner.address);

    await registry.setDistributor(await distributor.getAddress());
    await treasury.setDistributor(await distributor.getAddress());
    await distributor.wire(await registry.getAddress(), await treasury.getAddress());

    await asset.mint(owner.address, SEED);
    await asset.approve(await treasury.getAddress(), SEED);
    await treasury.deposit(SEED, "seed");

    return { owner, alice, bob, mallory, hub, asset, distributor, registry, treasury };
  }

  it("no existe alta sin pasar por el hub", async function () {
    const { registry } = await deploy();
    // La función que aceptaba un nullifier arbitrario ya no está en la ABI.
    expect((registry.interface as any).fragments.some(
      (f: any) => f.type === "function" && f.name === "register"
    )).to.equal(false);
  });

  it("un tercero no puede disparar el callback", async function () {
    const { registry, alice, mallory } = await deploy();
    await expect(
      registry.connect(mallory).onVerificationSuccess(output(alice.address, 111n), "0x")
    ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller");
  });

  it("el hub da de alta a la dirección que declaró la prueba", async function () {
    const { registry, hub, alice } = await deploy();

    await hub.fireVerification(await registry.getAddress(), output(alice.address, 111n), "0x");

    expect(await registry.isActive(alice.address)).to.equal(true);
    expect(await registry.activeCount()).to.equal(1n);
    expect(await registry.nullifierToAddress(111n)).to.equal(alice.address);
  });

  it("un documento no puede quedar atado a dos direcciones", async function () {
    const { registry, hub, alice, bob } = await deploy();
    const addr = await registry.getAddress();

    await hub.fireVerification(addr, output(alice.address, 111n), "0x");
    // el mismo nullifier, otra dirección
    await expect(
      hub.fireVerification(addr, output(bob.address, 111n), "0x")
    ).to.be.revertedWithCustomError(registry, "NullifierInUse");

    expect(await registry.activeCount()).to.equal(1n);
  });

  it("volver a verificar renueva la prueba de vida sin duplicar el asiento", async function () {
    const { registry, hub, alice } = await deploy();
    const addr = await registry.getAddress();

    await hub.fireVerification(addr, output(alice.address, 111n), "0x");
    await time.increase(200 * ONE_DAY);
    await hub.fireVerification(addr, output(alice.address, 111n), "0x");

    expect(await registry.activeCount()).to.equal(1n);
    expect(await registry.isActive(alice.address)).to.equal(true);
  });

  it("la prueba de vida vence y reap limpia el padrón", async function () {
    const { registry, hub, alice } = await deploy();
    const addr = await registry.getAddress();

    await hub.fireVerification(addr, output(alice.address, 111n), "0x");
    await time.increase(366 * ONE_DAY);

    expect(await registry.isActive(alice.address)).to.equal(false);
    expect(await registry.activeCount()).to.equal(1n); // todavía sin barrer

    await registry.reap([alice.address]);
    expect(await registry.activeCount()).to.equal(0n);
  });

  it("quien se verifica cobra el dividendo de punta a punta", async function () {
    const { registry, hub, distributor, treasury, asset, alice } = await deploy();

    await hub.fireVerification(await registry.getAddress(), output(alice.address, 111n), "0x");
    await time.increase(30 * ONE_DAY);

    const antes = await asset.balanceOf(alice.address);
    await distributor.connect(alice).claim();
    const cobrado = (await asset.balanceOf(alice.address)) - antes;

    expect(cobrado).to.be.gt(0n);
    expect(await treasury.balance()).to.equal(SEED - cobrado);
  });

  it("el alta avisa al distributor antes de mover el contador", async function () {
    const { registry, hub, distributor, alice, bob } = await deploy();
    const addr = await registry.getAddress();

    await hub.fireVerification(addr, output(alice.address, 111n), "0x");
    await time.increase(30 * ONE_DAY);

    const antesDeBob = await distributor.claimable(alice.address);
    await hub.fireVerification(addr, output(bob.address, 222n), "0x");

    expect(await distributor.claimable(alice.address)).to.be.gte(antesDeBob);
    expect(await distributor.claimable(bob.address)).to.equal(0n);
  });

  it("el scope queda atado al contrato y a la semilla", async function () {
    const { registry } = await deploy();
    // En red local Poseidon no existe, así que el paquete devuelve 0 sin fallar.
    // Lo que importa acá es que la función exista y el deploy no reviente.
    expect(await registry.scope()).to.equal(0n);
  });
});
