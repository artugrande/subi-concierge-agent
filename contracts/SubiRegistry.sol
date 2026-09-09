// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";
import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import {ISubiRegistry} from "./ISubiRegistry.sol";

/// @dev Callbacks the registry fires on the distributor.
interface IDistributor {
    function onRegister(address human) external;
    function onDeregister(address human) external;
}

/**
 * @title SubiRegistry
 * @notice Padrón de humanos verificados con Self, con prueba de vida y resistencia a sybil.
 *
 * @dev El alta ocurre ÚNICAMENTE a través de una prueba de conocimiento cero de Self.
 *      El usuario llama `verifySelfProof` (heredada), el hub de Self valida la prueba y
 *      devuelve el control en `customVerificationHook`, que es donde se escribe el padrón.
 *      No hay ninguna otra puerta de entrada: la versión anterior aceptaba un nullifier
 *      arbitrario por parámetro, así que cualquiera podía inventar identidades.
 *
 *      El `nullifier` que entrega Self es determinístico por documento y por scope, y no
 *      revela nada del documento. El scope se deriva de la dirección de este contrato más
 *      una semilla, así que el nullifier de SUBI no es correlacionable con el de ninguna
 *      otra aplicación que use Self.
 */
contract SubiRegistry is ISubiRegistry, SelfVerificationRoot {

    // --- Eventos ----------------------------------------------------------

    event Registered(address indexed account, uint256 indexed nullifier);
    event Renewed(address indexed account, uint256 newExpiration);
    event Deregistered(address indexed account);
    event DistributorSet(address indexed distributor);

    // --- Errores ----------------------------------------------------------

    error NotRegistered();
    error CooldownNotElapsed();
    error InvalidNullifier();
    error NullifierInUse();
    error OnlyOwner();
    error AlreadyWired();
    error ZeroAddress();

    // --- Constantes -------------------------------------------------------

    /// @notice Duración de la prueba de vida
    uint256 public constant PROOF_DURATION = 365 days;

    /// @notice Cooldown para reasignar un nullifier a otra dirección
    uint256 public constant REBIND_COOLDOWN = 30 days;

    // --- Estado -----------------------------------------------------------

    /// @notice Config de verificación registrada en el hub de Self
    bytes32 public verificationConfigId;

    /// @notice Distribuidor que recibe los avisos. Se fija una sola vez.
    /// @dev No es immutable a propósito: el distribuidor necesita la dirección de este
    ///      registry y viceversa. Con un argumento de constructor había que pasar un
    ///      placeholder, y ese placeholder terminó en mainnet sin reemplazar.
    address public distributor;

    /// @notice Dueño, habilitado a fijar el distribuidor una única vez.
    address public owner;

    uint256 private _activeCount;

    struct Registration {
        uint256 nullifier;   // identificador único del documento, vía Self
        uint256 expiration;  // vencimiento de la prueba de vida
        uint256 unbindTime;  // desde cuándo se puede reasignar
    }

    mapping(address => Registration) public registrations;
    mapping(uint256 => address) public nullifierToAddress;

    // --- Constructor ------------------------------------------------------

    /**
     * @param hub          Identity Verification Hub V2 de Self en esta red.
     *                     En Celo mainnet: 0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
     * @param scopeSeed    Semilla del scope. Junto con la dirección de este contrato
     *                     determina el nullifier, así que cambiarla invalida el padrón.
     * @param cfg          Config de verificación: edad mínima, países bloqueados, OFAC.
     */
    constructor(
        address hub,
        string memory scopeSeed,
        SelfUtils.UnformattedVerificationConfigV2 memory cfg
    ) SelfVerificationRoot(hub, scopeSeed) {
        owner = msg.sender;

        // En redes locales el hub es un mock o no existe; ahí no hay config que registrar.
        if (hub != address(0)) {
            verificationConfigId = IIdentityVerificationHubV2(hub)
                .setVerificationConfigV2(SelfUtils.formatVerificationConfigV2(cfg));
        }
    }

    // --- Cableado ---------------------------------------------------------

    function setDistributor(address distributor_) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (distributor != address(0)) revert AlreadyWired();
        if (distributor_ == address(0)) revert ZeroAddress();
        distributor = distributor_;
        emit DistributorSet(distributor_);
    }

    // --- Integración con Self ---------------------------------------------

    /// @inheritdoc SelfVerificationRoot
    function getConfigId(
        bytes32, /* destinationChainId */
        bytes32, /* userIdentifier */
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    /**
     * @notice Se ejecuta cuando el hub de Self validó la prueba.
     * @dev Única vía de alta. `userIdentifier` viene de la prueba y es la dirección que
     *      el usuario declaró al generarla, así que nadie puede dar de alta a un tercero.
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory /* userData */
    ) internal override {
        address account = address(uint160(output.userIdentifier));
        if (account == address(0)) revert ZeroAddress();
        if (output.nullifier == 0) revert InvalidNullifier();

        _register(account, output.nullifier);
    }

    // --- Padrón -----------------------------------------------------------

    function _register(address account, uint256 nullifier) internal {
        Registration storage reg = registrations[account];

        // Reasignación: la dirección ya tenía un nullifier distinto
        if (reg.nullifier != 0 && reg.nullifier != nullifier) {
            if (block.timestamp < reg.unbindTime) revert CooldownNotElapsed();
            delete nullifierToAddress[reg.nullifier];
        }

        // Un documento no puede estar atado a dos direcciones a la vez
        address duenoActual = nullifierToAddress[nullifier];
        if (duenoActual != address(0) && duenoActual != account) revert NullifierInUse();

        bool esAltaNueva = !_isActive(account);

        reg.nullifier = nullifier;
        reg.expiration = block.timestamp + PROOF_DURATION;
        if (reg.unbindTime == 0) reg.unbindTime = block.timestamp + REBIND_COOLDOWN;
        nullifierToAddress[nullifier] = account;

        if (esAltaNueva) {
            // El aviso va ANTES de mover el contador: lo devengado hasta acá se reparte
            // entre los que ya estaban, no entre los que estaban más este.
            if (distributor != address(0)) IDistributor(distributor).onRegister(account);
            _activeCount++;
            emit Registered(account, nullifier);
        } else {
            // Ya estaba activo: esto es una renovación de la prueba de vida
            emit Renewed(account, reg.expiration);
        }
    }

    /// @notice Baja voluntaria.
    function deregister() external {
        Registration storage reg = registrations[msg.sender];
        if (reg.nullifier == 0) revert NotRegistered();

        bool estabaActivo = _isActive(msg.sender);

        delete nullifierToAddress[reg.nullifier];
        delete registrations[msg.sender];

        if (estabaActivo) {
            if (distributor != address(0)) IDistributor(distributor).onDeregister(msg.sender);
            _activeCount--;
        }

        emit Deregistered(msg.sender);
    }

    /**
     * @notice Da de baja pruebas de vida vencidas. Sin permisos.
     * @dev Mientras el contador sobreestime, el sistema paga de menos y nunca de más,
     *      así que limpiar tarde es seguro.
     */
    function reap(address[] calldata accounts) external {
        for (uint256 i = 0; i < accounts.length; i++) {
            Registration storage reg = registrations[accounts[i]];
            if (reg.nullifier != 0 && block.timestamp > reg.expiration) {
                delete nullifierToAddress[reg.nullifier];
                delete registrations[accounts[i]];

                if (distributor != address(0)) IDistributor(distributor).onDeregister(accounts[i]);
                _activeCount--;

                emit Deregistered(accounts[i]);
            }
        }
    }

    // --- ISubiRegistry ----------------------------------------------------

    function _isActive(address account) internal view returns (bool) {
        Registration memory reg = registrations[account];
        return reg.nullifier != 0 && block.timestamp <= reg.expiration;
    }

    function isActive(address account) external view override returns (bool) {
        return _isActive(account);
    }

    function activeCount() external view override returns (uint256) {
        return _activeCount;
    }
}
