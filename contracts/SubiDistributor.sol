// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISubiRegistry} from "./ISubiRegistry.sol";

/// @notice Minimal treasury interface used by the distributor to pull funds on demand.
interface ISubiTreasury {
    function withdraw(address to, uint256 amount) external;
    function balance() external view returns (uint256);
}

/**
 * @title SubiDistributor
 * @notice Distributes daily UBI to Self-verified humans using accumulated index pattern
 * @dev The amount is derived, not fixed:
 *
 *      budget = distributable × drawRate × (Δt / 365d)
 *      perCapita = budget / activeHumans
 *
 *      where distributable = (own balance + treasury balance) - accruedUnclaimed
 *
 *      Properties:
 *      1. Structurally insolvent-proof (distributes % of what exists)
 *      2. Zero discretion (math determines payout)
 *      3. O(1) cost per user regardless of time elapsed or registry size
 *
 * @dev Based on the reference implementation at https://subi.space/SubiDistributor.sol.txt
 *
 * WIRING
 * ------
 * Registry and treasury are NOT constructor arguments. The registry needs the
 * distributor address and the distributor needs the registry address, so making
 * both immutable makes the pair undeployable: the first one deployed cannot know
 * the second. The previous version worked around it with a placeholder address
 * that was never replaced, which is why the mainnet registry pointed at 0x…01 and
 * silently never notified the distributor.
 *
 * Deployment order is now: distributor → registry → treasury → wire() → setters.
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

    IERC20 public immutable asset; // USDC, USDT, cUSD, or other stablecoin

    // --- State ------------------------------------------------------------

    /// @notice Registry of verified humans. Set once by `wire`.
    ISubiRegistry public registry;

    /// @notice Treasury the distributor pulls from. Set once by `wire`.
    ISubiTreasury public treasury;

    /// @notice True once `wire` has run. Wiring cannot be changed afterwards.
    bool public wired;

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

    event Wired(address indexed registry, address indexed treasury);
    event Accrued(uint256 budget, uint256 perCapita, uint256 activeCount);
    event Claimed(address indexed human, uint256 amount);
    event Forfeited(address indexed human, uint256 amount);
    event DrawRateSet(uint256 oldBps, uint256 newBps);

    // --- Errors -----------------------------------------------------------

    error NotVerified();
    error NothingToClaim();
    error DrawRateTooHigh();
    error OnlyRegistry();
    error OnlyOwner();
    error AlreadyWired();
    error NotWired();
    error ZeroAddress();

    // --- Constructor ------------------------------------------------------

    constructor(IERC20 asset_, uint256 drawRateBps_) {
        if (drawRateBps_ > MAX_DRAW_RATE_BPS) revert DrawRateTooHigh();
        if (address(asset_) == address(0)) revert ZeroAddress();

        asset = asset_;
        drawRateBps = drawRateBps_;
        lastAccrual = block.timestamp;
        owner = msg.sender;
    }

    // --- Wiring -----------------------------------------------------------

    /**
     * @notice Bind the registry and the treasury. Callable once, by the owner.
     * @dev Resets `lastAccrual` so the idle period before wiring is not distributed.
     */
    function wire(ISubiRegistry registry_, ISubiTreasury treasury_) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (wired) revert AlreadyWired();
        if (address(registry_) == address(0) || address(treasury_) == address(0)) revert ZeroAddress();

        registry = registry_;
        treasury = treasury_;
        wired = true;
        lastAccrual = block.timestamp;

        emit Wired(address(registry_), address(treasury_));
    }

    // --- Core Logic -------------------------------------------------------

    /**
     * @notice Funds available for distribution
     * @dev Counts what the distributor holds PLUS what the treasury holds, because
     *      contributions land in the treasury and are pulled on demand at claim time.
     *      Reading only `balanceOf(address(this))` is what made a funded treasury
     *      look empty and every claim revert.
     */
    function distributable() public view returns (uint256) {
        uint256 bal = asset.balanceOf(address(this));
        if (address(treasury) != address(0)) bal += treasury.balance();
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

        // Not wired yet: nothing to divide by. Advance the clock and wait.
        if (address(registry) == address(0)) {
            lastAccrual = block.timestamp;
            return;
        }

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
        if (address(registry) == address(0) || !registry.isActive(human)) return 0;

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
     * @dev O(1) gas cost regardless of time since last claim or registry size.
     *      Pulls the shortfall from the treasury so contributions never have to be
     *      pre-moved into this contract.
     */
    function claim() external returns (uint256 amount) {
        if (!wired) revert NotWired();
        if (!registry.isActive(msg.sender)) revert NotVerified();

        accrue();

        uint256 delta = accIndex - checkpoint[msg.sender];
        amount = delta / PRECISION;
        if (amount == 0) revert NothingToClaim();

        // Save full index (not truncated) - remainder carries forward
        checkpoint[msg.sender] = accIndex;
        accruedUnclaimed -= amount;

        uint256 own = asset.balanceOf(address(this));
        if (own < amount) treasury.withdraw(address(this), amount - own);

        asset.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    // --- Registry Hooks ---------------------------------------------------

    /**
     * @notice Called by registry on new registration
     * @dev The registry MUST call this before incrementing its active count, so the
     *      elapsed period is divided among the humans who were actually present.
     *      New human starts at the current index and claims nothing historical.
     */
    function onRegister(address human) external {
        if (msg.sender != address(registry)) revert OnlyRegistry();
        accrue();
        checkpoint[human] = accIndex;
    }

    /**
     * @notice Called by registry on deregistration
     * @dev The registry MUST call this before decrementing its active count.
     *      Anything the leaver accrued and never claimed is released back into the
     *      distributable pool. Without this the amount stayed inside
     *      `accruedUnclaimed` forever, permanently shrinking what everyone else
     *      could receive.
     */
    function onDeregister(address human) external {
        if (msg.sender != address(registry)) revert OnlyRegistry();
        accrue();

        uint256 owed = (accIndex - checkpoint[human]) / PRECISION;
        if (owed > 0) {
            accruedUnclaimed -= owed;
            emit Forfeited(human, owed);
        }
        checkpoint[human] = accIndex;
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
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
