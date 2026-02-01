// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TrustScore
 * @dev User reputation system for Laxigam blockchain
 * 
 * Features:
 * - Starting score: 50/100
 * - Score increases with successful transactions, NFT sales, positive votes
 * - Score decreases with scam reports, negative votes, AI rejections
 * - Transfer limits based on trust score
 * - Community voting system
 */
contract TrustScore is Ownable, AccessControl {
    bytes32 public constant AUTHORIZED_ROLE = keccak256("AUTHORIZED_ROLE");
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");
    
    struct UserProfile {
        uint256 registrationTime;
        uint256 transactionCount;
        uint256 nftSalesCount;
        uint256 scamReports;
        int256 communityVotes;
        uint256 aiRejections;
        bool registered;
    }
    
    mapping(address => UserProfile) public users;
    mapping(address => mapping(address => uint256)) public lastVoteTime;
    mapping(address => uint256) public lastRejectionTime;
    
    uint256 public constant VOTE_COOLDOWN = 30 days;
    uint256 public constant REJECTION_COOLDOWN = 7 days;
    
    // Transfer limits based on trust score
    uint256 public constant LIMIT_LOW = 100 * 10**18;      // < 30 score
    uint256 public constant LIMIT_MEDIUM = 1000 * 10**18;  // 30-70 score
    // > 70 score = unlimited

    // Events
    event UserRegistered(address indexed user, uint256 timestamp);
    event ScamReported(address indexed reporter, address indexed scammer, string evidence);
    event VoteCast(address indexed voter, address indexed target, bool positive, int256 weight);
    event AIRejectionRecorded(address indexed user, uint256 rejectionCount);
    event TransactionCountIncremented(address indexed user, uint256 newCount);
    event NFTSaleRecorded(address indexed user, uint256 saleCount);

    constructor() Ownable(msg.sender) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Register a new user with default trust score of 50
     */
    function registerUser(address user) public {
        if (!users[user].registered) {
            users[user] = UserProfile({
                registrationTime: block.timestamp,
                transactionCount: 0,
                nftSalesCount: 0,
                scamReports: 0,
                communityVotes: 0,
                aiRejections: 0,
                registered: true
            });
            emit UserRegistered(user, block.timestamp);
        }
    }

    /**
     * @dev Calculate user's current trust score
     * Starting score: 50
     * +1 per 10 successful transactions
     * +1 per day since registration (max +30)
     * +2 per NFT sold
     * +5 per positive community vote (weighted by voter score)
     * -20 per verified scam report
     * -5 per negative community vote
     * -10 per AI-rejected transaction
     */
    function getTrustScore(address user) public view returns (uint256) {
        if (!users[user].registered) return 50;

        uint256 score = 50;
        
        // Transaction bonus: +1 per 10 transactions
        score += users[user].transactionCount / 10;
        
        // Time bonus: +1 per day, max +30
        uint256 daysActive = (block.timestamp - users[user].registrationTime) / 1 days;
        if (daysActive > 30) daysActive = 30;
        score += daysActive;
        
        // NFT sales bonus: +2 per sale
        score += users[user].nftSalesCount * 2;
        
        // Community votes
        int256 votes = users[user].communityVotes;
        if (votes > 0) {
            score += uint256(votes);
        } else if (votes < 0) {
            uint256 neg = uint256(-votes);
            score = neg >= score ? 0 : score - neg;
        }
        
        // Scam report penalty: -20 per report
        uint256 scamPenalty = users[user].scamReports * 20;
        score = scamPenalty >= score ? 0 : score - scamPenalty;
        
        // AI rejection penalty: -10 per rejection
        uint256 rejectionPenalty = users[user].aiRejections * 10;
        score = rejectionPenalty >= score ? 0 : score - rejectionPenalty;
        
        // Cap at 100
        return score > 100 ? 100 : score;
    }
    
    /**
     * @dev Get detailed trust score breakdown
     */
    function getTrustScoreDetails(address user) external view returns (
        uint256 totalScore,
        uint256 baseScore,
        uint256 transactionBonus,
        uint256 timeBonus,
        uint256 nftBonus,
        int256 voteImpact,
        uint256 scamPenalty,
        uint256 rejectionPenalty,
        UserProfile memory profile
    ) {
        if (!users[user].registered) {
            return (50, 50, 0, 0, 0, 0, 0, 0, users[user]);
        }
        
        baseScore = 50;
        transactionBonus = users[user].transactionCount / 10;
        
        uint256 daysActive = (block.timestamp - users[user].registrationTime) / 1 days;
        timeBonus = daysActive > 30 ? 30 : daysActive;
        
        nftBonus = users[user].nftSalesCount * 2;
        voteImpact = users[user].communityVotes;
        scamPenalty = users[user].scamReports * 20;
        rejectionPenalty = users[user].aiRejections * 10;
        
        totalScore = getTrustScore(user);
        profile = users[user];
    }

    /**
     * @dev Increment transaction count (called by authorized contracts)
     */
    function incrementTransactionCount(address user) external onlyRole(AUTHORIZED_ROLE) {
        registerUser(user);
        users[user].transactionCount++;
        emit TransactionCountIncremented(user, users[user].transactionCount);
    }

    /**
     * @dev Record NFT sale (called by NFT marketplace)
     */
    function recordNFTSale(address user) external onlyRole(AUTHORIZED_ROLE) {
        registerUser(user);
        users[user].nftSalesCount++;
        emit NFTSaleRecorded(user, users[user].nftSalesCount);
    }
    
    /**
     * @dev Record AI rejection
     */
    function recordAIRejection(address user) external onlyRole(AUTHORIZED_ROLE) {
        registerUser(user);
        
        // Prevent spamming rejections (cooldown period)
        if (block.timestamp >= lastRejectionTime[user] + REJECTION_COOLDOWN) {
            users[user].aiRejections++;
            lastRejectionTime[user] = block.timestamp;
            emit AIRejectionRecorded(user, users[user].aiRejections);
        }
    }

    /**
     * @dev Report a scammer (requires reporter to have high trust score)
     */
    function reportScam(address scammer, string calldata evidence) external {
        require(getTrustScore(msg.sender) >= 70, "Reporter trust score too low");
        require(msg.sender != scammer, "Cannot self-report");
        require(bytes(evidence).length > 0, "Evidence required");
        
        registerUser(scammer);
        users[scammer].scamReports++;
        
        emit ScamReported(msg.sender, scammer, evidence);
    }

    /**
     * @dev Vote on a user's trustworthiness (once per month per voter-target pair)
     */
    function voteOnUser(address target, bool positive) external {
        require(msg.sender != target, "Cannot self-vote");
        require(block.timestamp >= lastVoteTime[msg.sender][target] + VOTE_COOLDOWN, "Vote cooldown active");
        require(users[target].registered, "Target not registered");
        
        registerUser(msg.sender);
        registerUser(target);
        
        // Vote weight based on voter's trust score
        uint256 voterScore = getTrustScore(msg.sender);
        int256 weight;
        if (voterScore > 70) {
            weight = 5;
        } else if (voterScore > 30) {
            weight = 3;
        } else {
            weight = 1;
        }
        
        users[target].communityVotes += positive ? weight : -weight;
        lastVoteTime[msg.sender][target] = block.timestamp;
        
        emit VoteCast(msg.sender, target, positive, weight);
    }
    
    /**
     * @dev Check if user is eligible for transaction of given amount
     */
    function isEligible(address user, uint256 amount) external view returns (bool) {
        uint256 score = getTrustScore(user);
        
        if (amount <= LIMIT_LOW) {
            return score >= 10;
        } else if (amount <= LIMIT_MEDIUM) {
            return score >= 30;
        } else {
            return score >= 50;
        }
    }
    
    /**
     * @dev Get maximum allowed transfer amount for user
     */
    function getMaxTransferAmount(address user) external view returns (uint256) {
        uint256 score = getTrustScore(user);
        
        if (score < 30) {
            return LIMIT_LOW;
        } else if (score <= 70) {
            return LIMIT_MEDIUM;
        } else {
            return type(uint256).max; // Unlimited
        }
    }

    /**
     * @dev Register an authorized contract
     */
    function registerAuthorizedContract(address addr) external onlyOwner {
        _grantRole(AUTHORIZED_ROLE, addr);
    }

    /**
     * @dev Remove authorized contract
     */
    function removeAuthorizedContract(address addr) external onlyOwner {
        _revokeRole(AUTHORIZED_ROLE, addr);
    }
    
    /**
     * @dev Register a game contract
     */
    function registerGameContract(address addr) external onlyOwner {
        _grantRole(GAME_ROLE, addr);
    }
    
    /**
     * @dev Remove game contract
     */
    function removeGameContract(address addr) external onlyOwner {
        _revokeRole(GAME_ROLE, addr);
    }
}
