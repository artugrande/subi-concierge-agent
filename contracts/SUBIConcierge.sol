// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SUBIConcierge
 * @dev Space UBI Concierge Agent contract for Celo Agents at Work Hackathon
 * 
 * This contract manages UBI claims and pledges for the SUBI Concierge Agent.
 * All transactions interacting with this contract MUST include the Celo
 * attribution tag for hackathon credit.
 */
contract SUBIConcierge {
    address public agentWallet;
    bool public initialized;
    
    mapping(address => uint256) public claimedAmounts;
    mapping(address => uint256) public pledgedAmounts;
    
    event UBIClaimed(address indexed user, uint256 amount);
    event UBIPledged(address indexed pledger, address indexed beneficiary, uint256 amount);
    event Initialized(address indexed agentWallet);
    
    constructor(address _agentWallet) {
        require(_agentWallet != address(0), "Invalid agent wallet");
        agentWallet = _agentWallet;
    }
    
    /**
     * @dev Initialize the contract (example function for deployment testing)
     */
    function initialize() external {
        require(!initialized, "Already initialized");
        initialized = true;
        emit Initialized(agentWallet);
    }
    
    /**
     * @dev Claim UBI for the sender
     * @param amount Amount to claim
     */
    function claim(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        claimedAmounts[msg.sender] += amount;
        
        emit UBIClaimed(msg.sender, amount);
    }
    
    /**
     * @dev Pledge UBI to a beneficiary
     * @param beneficiary Address to receive the pledge
     * @param amount Amount to pledge
     */
    function pledge(address beneficiary, uint256 amount) external payable {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be greater than 0");
        require(msg.value >= amount, "Insufficient value sent");
        
        pledgedAmounts[beneficiary] += amount;
        
        emit UBIPledged(msg.sender, beneficiary, amount);
    }
    
    /**
     * @dev Get claim status for an address
     * @param user Address to query
     * @return Amount claimed by the user
     */
    function getClaimedAmount(address user) external view returns (uint256) {
        return claimedAmounts[user];
    }
    
    /**
     * @dev Get pledge status for an address
     * @param beneficiary Address to query
     * @return Amount pledged to the beneficiary
     */
    function getPledgedAmount(address beneficiary) external view returns (uint256) {
        return pledgedAmounts[beneficiary];
    }
}
