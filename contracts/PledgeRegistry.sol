// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PledgeRegistry
 * @notice Public registry of voluntary Space Dividend Pledges
 * @dev Organizations declare:
 *      - Percentage of space-derived revenue committed
 *      - Guaranteed annual floor
 *      - Commitment duration
 *      - Hash of audited quarterly reports
 * 
 *      No legal enforceability by design (that would take decades to ratify)
 *      Instead: transparent, immutable record of who committed and who delivered
 */
contract PledgeRegistry {
    
    // --- Types ------------------------------------------------------------
    
    struct Pledge {
        address pledgor;            // Organization making the pledge
        string name;                // Organization name
        uint256 revenuePercentBps;  // % of space revenue (in basis points)
        uint256 annualFloorUSD;     // Minimum annual contribution (USD, 18 decimals)
        uint256 startDate;          // Commitment start timestamp
        uint256 endDate;            // Commitment end timestamp (0 = perpetual)
        string reportURI;           // IPFS/Arweave URI to pledge document
        bool active;                // Whether pledge is still active
    }
    
    struct Report {
        bytes32 reportHash;         // Hash of audited quarterly report
        uint256 timestamp;          // Report submission timestamp
        uint256 amountUSD;          // Amount contributed (USD, 18 decimals)
        string reportURI;           // URI to full report
    }
    
    // --- State ------------------------------------------------------------
    
    /// @notice All pledges by ID
    mapping(uint256 => Pledge) public pledges;
    
    /// @notice Pledge IDs by pledgor address
    mapping(address => uint256[]) public pledgorToPledges;
    
    /// @notice Quarterly reports by pledge ID
    mapping(uint256 => Report[]) public reports;
    
    /// @notice Next pledge ID
    uint256 public nextPledgeId;
    
    // --- Events -----------------------------------------------------------
    
    event PledgeCreated(
        uint256 indexed pledgeId,
        address indexed pledgor,
        string name,
        uint256 revenuePercentBps,
        uint256 annualFloorUSD
    );
    
    event ReportSubmitted(
        uint256 indexed pledgeId,
        bytes32 reportHash,
        uint256 amountUSD,
        string reportURI
    );
    
    event PledgeRevoked(uint256 indexed pledgeId);
    
    // --- Errors -----------------------------------------------------------
    
    error InvalidPercentage();
    error InvalidDates();
    error OnlyPledgor();
    error PledgeInactive();
    
    // --- Public Interface -------------------------------------------------
    
    /**
     * @notice Create a Space Dividend Pledge
     * @param name Organization name
     * @param revenuePercentBps Percentage of space-derived revenue (basis points)
     * @param annualFloorUSD Minimum annual contribution in USD (18 decimals)
     * @param startDate Commitment start timestamp
     * @param endDate Commitment end (0 for perpetual)
     * @param reportURI URI to pledge document
     * @return pledgeId The ID of the created pledge
     */
    function createPledge(
        string calldata name,
        uint256 revenuePercentBps,
        uint256 annualFloorUSD,
        uint256 startDate,
        uint256 endDate,
        string calldata reportURI
    ) external returns (uint256 pledgeId) {
        if (revenuePercentBps > 10000) revert InvalidPercentage();
        if (endDate != 0 && endDate <= startDate) revert InvalidDates();
        
        pledgeId = nextPledgeId++;
        
        pledges[pledgeId] = Pledge({
            pledgor: msg.sender,
            name: name,
            revenuePercentBps: revenuePercentBps,
            annualFloorUSD: annualFloorUSD,
            startDate: startDate,
            endDate: endDate,
            reportURI: reportURI,
            active: true
        });
        
        pledgorToPledges[msg.sender].push(pledgeId);
        
        emit PledgeCreated(
            pledgeId,
            msg.sender,
            name,
            revenuePercentBps,
            annualFloorUSD
        );
    }
    
    /**
     * @notice Submit quarterly report for a pledge
     * @param pledgeId The pledge ID
     * @param reportHash Hash of the audited report
     * @param amountUSD Amount contributed this quarter (USD, 18 decimals)
     * @param reportURI URI to full report document
     */
    function submitReport(
        uint256 pledgeId,
        bytes32 reportHash,
        uint256 amountUSD,
        string calldata reportURI
    ) external {
        Pledge storage pledge = pledges[pledgeId];
        if (pledge.pledgor != msg.sender) revert OnlyPledgor();
        if (!pledge.active) revert PledgeInactive();
        
        reports[pledgeId].push(Report({
            reportHash: reportHash,
            timestamp: block.timestamp,
            amountUSD: amountUSD,
            reportURI: reportURI
        }));
        
        emit ReportSubmitted(pledgeId, reportHash, amountUSD, reportURI);
    }
    
    /**
     * @notice Revoke a pledge (voluntary withdrawal)
     * @param pledgeId The pledge ID to revoke
     */
    function revokePledge(uint256 pledgeId) external {
        Pledge storage pledge = pledges[pledgeId];
        if (pledge.pledgor != msg.sender) revert OnlyPledgor();
        
        pledge.active = false;
        emit PledgeRevoked(pledgeId);
    }
    
    /**
     * @notice Get all reports for a pledge
     * @param pledgeId The pledge ID
     * @return All reports for this pledge
     */
    function getReports(uint256 pledgeId) external view returns (Report[] memory) {
        return reports[pledgeId];
    }
    
    /**
     * @notice Get all pledge IDs for an address
     * @param pledgor The pledgor address
     * @return Array of pledge IDs
     */
    function getPledgesByAddress(address pledgor) external view returns (uint256[] memory) {
        return pledgorToPledges[pledgor];
    }
    
    /**
     * @notice Check if a pledge is currently active and within its commitment period
     * @param pledgeId The pledge ID
     * @return Whether the pledge is active and current
     */
    function isPledgeActive(uint256 pledgeId) external view returns (bool) {
        Pledge memory pledge = pledges[pledgeId];
        if (!pledge.active) return false;
        if (block.timestamp < pledge.startDate) return false;
        if (pledge.endDate != 0 && block.timestamp > pledge.endDate) return false;
        return true;
    }
}
