// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISubiRegistry} from "./ISubiRegistry.sol";

/**
 * @title SubiDistributor
 * @notice Distributes daily UBI to Self-verified humans using accumulated index pattern
 * @dev The amount is derived, not fixed:
 * 
 *      budget = distributable × drawRate × (Δt / 365d)
 *      perCapita = budget / activeHumans
 * 
 *      where distributable = balance - accruedUnclaimed
 * 
 *      Properties:
 *      1. Structurally insolvent-proof (distributes % of what exists)
 *      2. Zero discretion (math determines payout)
 *      3. O(1) cost per user regardless of time elapsed or registry size
 * 
 * @dev Based on reference implementation from https://subi.space/SubiDistributor.sol.txt
 *      Adapted for Celo Agents at Work hackathon MVP
 */
contract SubiDistributor {
    using SafeERC20 for IERC20;
    
    // --- Constants --------------------------------------------------------
    
    uint256 private constant PRECISION = 1e18;
    uint256 private constant YEAR = 365 days;
    uint256 private constant BPS = 10_000;
    
    /// @dev Hard cap on draw rate - even compromised governance can't drain fund instantly
    uint256 public constant MAX_DRAW_RATE_BPS = 1_000; // 10% annual
    
    // --- Immutables -------------------------------------------------------
    
    IERC20 public immutable asset;  // USDC, USDT, cUSD, or other stablecoin
    ISubiRegistry public immutable registry;
    
    // --- State ------------------------------------------------------------
    
    /// @notice Annual draw rate in basis points (400 = 4%, Alaska POMV-style)
    uint256 public drawRateBps;
    
    /// @notice Accumulated payment index (scaled by PRECISION)
    /// @dev Hypothetical total payment to a human active since genesis
    uint256 public accIndex;
    
    /// @notice Timestamp of last accrual
    uint256 public lastAccrual;
    
    /// @notice Total accrued but unclaimed amount
    /// @dev Subtracted from balance to get distributable and avoid double-counting
    uint256 public accruedUnclaimed;
    
    /// @notice Each user's checkpoint against accIndex
    mapping(address => uint256) public checkpoint;
    
    /// @notice Contract owner (for governance functions)
    address public owner;
    
    // --- Events -----------------------------------------------------------
    
    event Accrued(uint256 budget, uint256 perCapita, uint256 activeCount);
    event Claimed(address indexed human, uint256 amount);
    event DrawRateSet(uint256 oldBps, uint256 newBps);
    
    // --- Errors -----------------------------------------------------------
    
    error NotVerified();
    error NothingToClaim();
    error DrawRateTooHigh();
    error OnlyRegistry();
    error OnlyOwner();
    
    // --- Constructor ------------------------------------------------------
    
    constructor(
        IERC20 asset_,
        ISubiRegistry registry_,
        uint256 drawRateBps_
    ) {
        if (drawRateBps_ > MAX_DRAW_RATE_BPS) revert DrawRateTooHigh();
        
        asset = asset_;
        registry = registry_;
        drawRateBps = drawRateBps_;
        lastAccrual = block.timestamp;
        owner = msg.sender;
    }
    
    // --- Core Logic -------------------------------------------------------
    
    /**
     * @notice Calculate distributable funds (balance minus accrued unclaimed)
     * @return Amount available for distribution
     */
    function distributable() public view returns (uint256) {
        uint256 bal = asset.balanceOf(address(this));
        return bal > accruedUnclaimed ? bal - accruedUnclaimed : 0;
    }
    
    /**
     * @notice Accrue dividend since last call
     * @dev Permissionless and idempotent - called by anyone, and internally by claim/register/deregister
     *      Advances time even if nothing to distribute (prevents historical catch-up on first human)
     */
    function accrue() public {
        uint256 dt = block.timestamp - lastAccrual;
        if (dt == 0) return;
        
        uint256 active = registry.activeCount();
        uint256 pool = distributable();
        
        // No registry or no funds -> just advance timestamp
        if (active == 0 || pool == 0) {
            lastAccrual = block.timestamp;
            return;
        }
        
        uint256 budget = (pool * drawRateBps * dt) / (BPS * YEAR);
        if (budget == 0) {
            lastAccrual = block.timestamp;
            return;
        }
        
        uint256 perCapita = (budget * PRECISION) / active;
        
        // Re-derive budget from rounded-down perCapita to ensure solvency
        uint256 exact = (perCapita * active) / PRECISION;
        
        accIndex += perCapita;
        accruedUnclaimed += exact;
        lastAccrual = block.timestamp;
        
        emit Accrued(exact, perCapita, active);
    }
    
    /**
     * @notice Calculate claimable amount for a human (read-only)
     * @param human Address to check
     * @return Amount claimable now (including pending accrual)
     */
    function claimable(address human) external view returns (uint256) {
        if (!registry.isActive(human)) return 0;
        
        uint256 idx = accIndex;
        uint256 dt = block.timestamp - lastAccrual;
        uint256 active = registry.activeCount();
        uint256 pool = distributable();
        
        // Simulate pending accrual
        if (dt > 0 && active > 0 && pool > 0) {
            uint256 budget = (pool * drawRateBps * dt) / (BPS * YEAR);
            idx += (budget * PRECISION) / active;
        }
        
        return (idx - checkpoint[human]) / PRECISION;
    }
    
    /**
     * @notice Claim accumulated dividend
     * @return amount Amount claimed
     * @dev O(1) gas cost regardless of time since last claim or registry size
     */
    function claim() external returns (uint256 amount) {
        if (!registry.isActive(msg.sender)) revert NotVerified();
        
        accrue();
        
        uint256 delta = accIndex - checkpoint[msg.sender];
        amount = delta / PRECISION;
        if (amount == 0) revert NothingToClaim();
        
        // Save full index (not truncated) - remainder carries forward
        checkpoint[msg.sender] = accIndex;
        accruedUnclaimed -= amount;
        
        asset.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }
    
    // --- Registry Hooks ---------------------------------------------------
    
    /**
     * @notice Called by registry on new registration
     * @dev Accrues before activeCount changes to maintain correct accounting
     *      New human starts at current index (doesn't claim historical accrual)
     */
    function onRegister(address human) external {
        if (msg.sender != address(registry)) revert OnlyRegistry();
        accrue();
        checkpoint[human] = accIndex;
    }
    
    /**
     * @notice Called by registry on deregistration
     * @dev Accrues before activeCount changes
     *      Unclaimed balance remains claimable if human re-registers
     */
    function onDeregister(address /*human*/) external {
        if (msg.sender != address(registry)) revert OnlyRegistry();
        accrue();
    }
    
    // --- Governance -------------------------------------------------------
    
    /**
     * @notice Update draw rate
     * @dev In production: multisig + timelock
     *      MAX_DRAW_RATE_BPS is immutable and cannot be raised
     */
    function setDrawRate(uint256 newBps) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (newBps > MAX_DRAW_RATE_BPS) revert DrawRateTooHigh();
        
        accrue();
        emit DrawRateSet(drawRateBps, newBps);
        drawRateBps = newBps;
    }
    
    /**
     * @notice Transfer ownership
     * @dev In production: use 2-step transfer
     */
    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert OnlyOwner();
        owner = newOwner;
    }
}
