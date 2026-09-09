// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISubiRegistry} from "./ISubiRegistry.sol";

/**
 * @title SubiRegistry
 * @notice Registry for Self-verified humans with proof-of-life expiration
 * @dev In production, this inherits from SelfVerificationRoot and verifies ZK proofs
 *      For hackathon MVP: simplified version with manual registration hooks
 *      
 *      PRODUCTION TODO:
 *      - Integrate Self protocol ZK proof verification
 *      - Implement nullifier-based unique identity (one human, one slot)
 *      - Add rebinding with 30-day cooldown
 *      - Add proof-of-life 12-month expiration
 */
contract SubiRegistry is ISubiRegistry {
    
    // --- Events -----------------------------------------------------------
    
    event Registered(address indexed account, bytes32 indexed nullifier);
    event Renewed(address indexed account, uint256 newExpiration);
    event Deregistered(address indexed account);
    event DistributorSet(address indexed distributor);
    
    // --- Errors -----------------------------------------------------------
    
    error AlreadyRegistered();
    error NotRegistered();
    error ProofExpired();
    error CooldownNotElapsed();
    error InvalidNullifier();
    error OnlyOwner();
    error AlreadyWired();
    error ZeroAddress();
    
    // --- State ------------------------------------------------------------
    
    /// @notice Proof-of-life duration (12 months)
    uint256 public constant PROOF_DURATION = 365 days;
    
    /// @notice Rebinding cooldown (30 days)
    uint256 public constant REBIND_COOLDOWN = 30 days;
    
    /// @notice Distributor contract that receives callbacks. Set once by the owner.
    /// @dev NOT immutable on purpose: the distributor needs this registry's address and
    ///      this registry needs the distributor's, so a constructor argument forces a
    ///      placeholder. The previous version shipped that placeholder (0x…01) to
    ///      mainnet, so the distributor was never notified of anything.
    address public distributor;

    /// @notice Owner, allowed to bind the distributor exactly once.
    address public owner;
    
    /// @notice Total count of active (non-expired) registrations
    uint256 private _activeCount;
    
    /// @notice Registration data per address
    struct Registration {
        bytes32 nullifier;      // Self protocol nullifier (unique per human)
        uint256 expiration;     // Proof-of-life expiration timestamp
        uint256 unbindTime;     // Earliest time for rebinding (0 if never bound)
    }
    
    mapping(address => Registration) public registrations;
    mapping(bytes32 => address) public nullifierToAddress;
    
    // --- Constructor ------------------------------------------------------
    
    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Bind the distributor. Callable once, by the owner.
     */
    function setDistributor(address distributor_) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (distributor != address(0)) revert AlreadyWired();
        if (distributor_ == address(0)) revert ZeroAddress();
        distributor = distributor_;
        emit DistributorSet(distributor_);
    }
    
    // --- Public Interface -------------------------------------------------
    
    /**
     * @notice Register with a Self ZK proof
     * @dev STUB: In production, this verifies the ZK proof and extracts the nullifier
     *      For MVP: accepts a nullifier directly for demonstration
     */
    function register(bytes32 nullifier) external {
        if (nullifier == bytes32(0)) revert InvalidNullifier();
        
        Registration storage reg = registrations[msg.sender];
        
        // Check if rebinding (already registered before)
        if (reg.nullifier != bytes32(0)) {
            if (block.timestamp < reg.unbindTime) revert CooldownNotElapsed();
            
            // Deregister old nullifier binding
            delete nullifierToAddress[reg.nullifier];
        }
        
        // Check nullifier isn't already bound to another address
        if (nullifierToAddress[nullifier] != address(0) && 
            nullifierToAddress[nullifier] != msg.sender) {
            revert AlreadyRegistered();
        }
        
        // Register new binding
        reg.nullifier = nullifier;
        reg.expiration = block.timestamp + PROOF_DURATION;
        reg.unbindTime = block.timestamp + REBIND_COOLDOWN;
        nullifierToAddress[nullifier] = msg.sender;
        
        // El devengo del período que termina se reparte entre los que YA estaban.
        // Por eso el aviso va antes de incrementar el contador.
        IDistributor(distributor).onRegister(msg.sender);

        _activeCount++;
        
        emit Registered(msg.sender, nullifier);
    }
    
    /**
     * @notice Renew proof-of-life (must be done every 12 months)
     * @dev In production, this verifies a new ZK proof with the same nullifier
     */
    function renew() external {
        Registration storage reg = registrations[msg.sender];
        if (reg.nullifier == bytes32(0)) revert NotRegistered();
        
        // Grace period: allow renewal even if expired (to avoid losing slot)
        reg.expiration = block.timestamp + PROOF_DURATION;
        
        emit Renewed(msg.sender, reg.expiration);
    }
    
    /**
     * @notice Manually deregister (voluntary exit)
     */
    function deregister() external {
        Registration storage reg = registrations[msg.sender];
        if (reg.nullifier == bytes32(0)) revert NotRegistered();
        
        delete nullifierToAddress[reg.nullifier];
        delete registrations[msg.sender];
        
        // El que se va todavía cuenta para el período que termina.
        IDistributor(distributor).onDeregister(msg.sender);

        _activeCount--;
        
        emit Deregistered(msg.sender);
    }
    
    /**
     * @notice Reap expired registrations (can be called by anyone)
     * @dev This keeps activeCount accurate but isn't strictly required for solvency
     */
    function reap(address[] calldata accounts) external {
        for (uint256 i = 0; i < accounts.length; i++) {
            Registration storage reg = registrations[accounts[i]];
            if (reg.nullifier != bytes32(0) && block.timestamp > reg.expiration) {
                delete nullifierToAddress[reg.nullifier];
                delete registrations[accounts[i]];
                IDistributor(distributor).onDeregister(accounts[i]);

                _activeCount--;
                emit Deregistered(accounts[i]);
            }
        }
    }
    
    // --- ISubiRegistry Implementation -------------------------------------
    
    function isActive(address account) external view override returns (bool) {
        Registration memory reg = registrations[account];
        return reg.nullifier != bytes32(0) && block.timestamp <= reg.expiration;
    }
    
    function activeCount() external view override returns (uint256) {
        return _activeCount;
    }
}

/**
 * @dev Minimal interface for distributor callbacks
 */
interface IDistributor {
    function onRegister(address human) external;
    function onDeregister(address human) external;
}
