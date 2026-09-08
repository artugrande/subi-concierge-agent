// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SubiTreasury
 * @notice Custodies stablecoins and tracks attribution by contributor
 * @dev Accepts deposits from anyone without permission
 *      Tracks contribution ledger for transparency
 *      Only distributor contract can withdraw
 */
contract SubiTreasury {
    using SafeERC20 for IERC20;
    
    // --- Events -----------------------------------------------------------
    
    event Deposited(address indexed contributor, uint256 amount, string attribution);
    event Withdrawn(address indexed to, uint256 amount);
    event DistributorSet(address indexed newDistributor);
    
    // --- Errors -----------------------------------------------------------
    
    error OnlyDistributor();
    error ZeroAmount();
    
    // --- State ------------------------------------------------------------
    
    /// @notice The stablecoin held by this treasury (USDC, USDT, or similar)
    IERC20 public immutable asset;
    
    /// @notice The distributor contract authorized to withdraw
    address public distributor;
    
    /// @notice Owner who can update the distributor address
    address public owner;
    
    /// @notice Total contributions by address
    mapping(address => uint256) public contributions;
    
    /// @notice Total deposits received
    uint256 public totalDeposited;
    
    // --- Constructor ------------------------------------------------------
    
    constructor(IERC20 asset_, address owner_) {
        asset = asset_;
        owner = owner_;
    }
    
    // --- Public Interface -------------------------------------------------
    
    /**
     * @notice Deposit stablecoins into the treasury
     * @param amount Amount to deposit
     * @param attribution Optional string for attribution (company name, mission, etc)
     * @dev Anyone can deposit - permissionless by design
     *      IMPORTANT: Caller must approve this contract first
     */
    function deposit(uint256 amount, string calldata attribution) external {
        if (amount == 0) revert ZeroAmount();
        
        contributions[msg.sender] += amount;
        totalDeposited += amount;
        
        asset.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposited(msg.sender, amount, attribution);
    }
    
    /**
     * @notice Withdraw funds to distributor
     * @param to Recipient address
     * @param amount Amount to withdraw
     * @dev Only callable by the distributor contract
     */
    function withdraw(address to, uint256 amount) external {
        if (msg.sender != distributor) revert OnlyDistributor();
        if (amount == 0) revert ZeroAmount();
        
        asset.safeTransfer(to, amount);
        
        emit Withdrawn(to, amount);
    }
    
    /**
     * @notice Get current treasury balance
     */
    function balance() external view returns (uint256) {
        return asset.balanceOf(address(this));
    }
    
    // --- Admin Functions --------------------------------------------------
    
    /**
     * @notice Set the distributor contract address
     * @dev In production, this would be behind a timelock multisig
     */
    function setDistributor(address newDistributor) external {
        require(msg.sender == owner, "only owner");
        distributor = newDistributor;
        emit DistributorSet(newDistributor);
    }
    
    /**
     * @notice Transfer ownership
     * @dev In production, use a proper 2-step ownership transfer
     */
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "only owner");
        owner = newOwner;
    }
}
