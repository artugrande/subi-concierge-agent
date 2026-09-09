// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SelfStructs} from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";

/// @dev Hub de Self simulado, sólo para tests.
///      Reemplaza la verificación de la prueba ZK por una llamada directa, para poder
///      ejercitar el camino real del callback sin generar pruebas de verdad.
///      Las firmas replican las del hub real: si cambian upstream, esto rompe y avisa.
interface ISelfCallback {
    function onVerificationSuccess(bytes memory output, bytes memory userData) external;
}

contract MockSelfHub {
    bytes32 public lastConfigId;
    uint256 private _n;

    /// @notice Imita `setVerificationConfigV2` con la firma real del hub.
    function setVerificationConfigV2(
        SelfStructs.VerificationConfigV2 memory
    ) external returns (bytes32) {
        lastConfigId = keccak256(abi.encodePacked("cfg", _n++));
        return lastConfigId;
    }

    /// @notice Dispara el callback como lo haría el hub tras validar una prueba.
    function fireVerification(address target, bytes memory output, bytes memory userData) external {
        ISelfCallback(target).onVerificationSuccess(output, userData);
    }

    /// @dev No se usa en los tests, existe para completar la interfaz.
    function verify(bytes memory, bytes memory) external pure {}
}
