// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ISubiRegistry
 * @notice Minimal registry interface for Self-verified humans
 * @dev Implemented by SubiRegistry which inherits from SelfVerificationRoot
 */
interface ISubiRegistry {
    /**
     * @notice Check if an account is currently active (verified and not expired)
     * @param account The address to check
     * @return True if the account has a valid, non-expired Self proof
     */
    function isActive(address account) external view returns (bool);

    /**
     * @notice Get the count of currently active verified humans
     * @return The number of active accounts in the registry
     * @dev If this overestimates (due to expired proofs not yet reaped),
     *      the system pays LESS per capita, never more. The error is conservative.
     */
    function activeCount() external view returns (uint256);
}
