// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LXGToken.sol";
import "./TrustScore.sol";

/**
 * @title Governance
 * @dev Decentralized DAO for Laxigam protocol changes
 * 
 * Features:
 * - Proposal creation (requires 1,000+ LXG)
 * - Voting with weighted voting power
 * - 48-hour timelock before execution
 * - 51% approval required
 * - Emergency pause/unpause functionality
 */
contract Governance is Ownable, Pausable, ReentrancyGuard {
    
    LXGToken public lxgToken;
    TrustScore public trustScore;
    
    uint256 public constant PROPOSAL_THRESHOLD = 1000 * 10**18; // 1,000 LXG
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant TIMELOCK_DURATION = 48 hours;
    uint256 public constant EXECUTION_WINDOW = 7 days;
    uint256 public constant QUORUM_PERCENTAGE = 10; // 10% of total supply
    
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }
    
    enum ProposalType {
        GasFeeChange,
        AddGame,
        RemoveGame,
        TrustScoreParams,
        EmergencyPause,
        EmergencyUnpause,
        UpgradeContract,
        Other
    }
    
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        bytes callData;
        address target;
        ProposalType proposalType;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        uint256 eta; // Estimated time of arrival for execution
        bool executed;
        bool canceled;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voteWeight;
    }
    
    struct ProposalVotes {
        uint256 forVotes;
        uint256 againstVotes;
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public lastProposalTime;
    mapping(address => uint256[]) public userProposals;
    mapping(uint256 => address[]) public proposalVoters;
    
    uint256 public proposalCount;
    
    // Authorized targets for proposals
    mapping(address => bool) public authorizedTargets;
    
    // Events
    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        string description,
        ProposalType proposalType,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    
    event ProposalCanceled(uint256 indexed id);
    event ProposalQueued(uint256 indexed id, uint256 eta);
    event ProposalExecuted(uint256 indexed id);
    event ProposalDefeated(uint256 indexed id);
    event TargetAuthorized(address indexed target);
    event TargetRevoked(address indexed target);

    constructor(address _lxgToken, address _trustScore) Ownable(msg.sender) {
        require(_lxgToken != address(0), "Invalid token address");
        require(_trustScore != address(0), "Invalid trust score address");
        lxgToken = LXGToken(_lxgToken);
        trustScore = TrustScore(_trustScore);
    }
    
    /**
     * @dev Authorize a contract as valid proposal target
     */
    function authorizeTarget(address target) external onlyOwner {
        authorizedTargets[target] = true;
        emit TargetAuthorized(target);
    }
    
    /**
     * @dev Revoke target authorization
     */
    function revokeTarget(address target) external onlyOwner {
        authorizedTargets[target] = false;
        emit TargetRevoked(target);
    }

    /**
     * @dev Create a new proposal
     */
    function createProposal(
        string calldata description,
        bytes calldata callData,
        address target,
        ProposalType proposalType
    ) external whenNotPaused returns (uint256) {
        require(lxgToken.balanceOf(msg.sender) >= PROPOSAL_THRESHOLD, "Insufficient LXG");
        require(bytes(description).length > 0, "Description required");
        require(callData.length > 0, "Call data required");
        require(authorizedTargets[target] || target == address(this), "Unauthorized target");
        require(
            block.timestamp >= lastProposalTime[msg.sender] + 7 days,
            "Proposal cooldown active"
        );
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.description = description;
        newProposal.callData = callData;
        newProposal.target = target;
        newProposal.proposalType = proposalType;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + VOTING_PERIOD;
        newProposal.executed = false;
        newProposal.canceled = false;
        
        userProposals[msg.sender].push(proposalId);
        lastProposalTime[msg.sender] = block.timestamp;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            description,
            proposalType,
            newProposal.startTime,
            newProposal.endTime
        );
        
        return proposalId;
    }
    
    /**
     * @dev Vote on a proposal
     */
    function vote(uint256 proposalId, bool support) external whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.id > 0, "Proposal not found");
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.canceled, "Proposal canceled");
        
        // Calculate voting power: (LXG balance / 1e18) + (trustScore * 10)
        uint256 lxgBalance = lxgToken.balanceOf(msg.sender);
        uint256 trustScoreValue = trustScore.getTrustScore(msg.sender);
        uint256 votingPower = (lxgBalance / 10**18) + (trustScoreValue * 10);
        
        require(votingPower > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        proposal.voteWeight[msg.sender] = votingPower;
        proposalVoters[proposalId].push(msg.sender);
        
        if (support) {
            proposal.forVotes += votingPower;
        } else {
            proposal.againstVotes += votingPower;
        }
        
        emit VoteCast(proposalId, msg.sender, support, votingPower);
    }
    
    /**
     * @dev Queue a successful proposal for execution (timelock)
     */
    function queueProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.id > 0, "Proposal not found");
        require(block.timestamp > proposal.endTime, "Voting not ended");
        require(!proposal.canceled, "Proposal canceled");
        require(!proposal.executed, "Already executed");
        require(proposal.eta == 0, "Already queued");
        
        // Check if proposal succeeded (51% approval + quorum)
        require(_proposalSucceeded(proposal), "Proposal did not succeed");
        
        proposal.eta = block.timestamp + TIMELOCK_DURATION;
        
        emit ProposalQueued(proposalId, proposal.eta);
    }

    /**
     * @dev Execute a queued proposal after timelock
     */
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.id > 0, "Proposal not found");
        require(proposal.eta > 0, "Not queued");
        require(block.timestamp >= proposal.eta, "Timelock not expired");
        require(block.timestamp <= proposal.eta + EXECUTION_WINDOW, "Execution window expired");
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Proposal canceled");
        
        proposal.executed = true;
        
        // Execute the proposal call
        (bool success, ) = proposal.target.call(proposal.callData);
        require(success, "Proposal execution failed");
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Cancel a proposal (proposer only, before voting ends)
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.id > 0, "Proposal not found");
        require(proposal.proposer == msg.sender || msg.sender == owner(), "Not authorized");
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Already canceled");
        require(block.timestamp < proposal.endTime, "Voting ended");
        
        proposal.canceled = true;
        
        emit ProposalCanceled(proposalId);
    }
    
    /**
     * @dev Internal function to check if proposal succeeded
     */
    function _proposalSucceeded(Proposal storage proposal) internal view returns (bool) {
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        
        // Check quorum
        uint256 quorum = (lxgToken.totalSupply() * QUORUM_PERCENTAGE) / 100;
        if (totalVotes < quorum) {
            return false;
        }
        
        // Check 51% approval
        return proposal.forVotes > (totalVotes * 51) / 100;
    }
    
    /**
     * @dev Get proposal state
     */
    function getProposalState(uint256 proposalId) external view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.canceled) return ProposalState.Canceled;
        if (proposal.executed) return ProposalState.Executed;
        if (proposal.eta > 0) {
            if (block.timestamp >= proposal.eta + EXECUTION_WINDOW) {
                return ProposalState.Expired;
            }
            if (block.timestamp >= proposal.eta) {
                return ProposalState.Queued;
            }
            return ProposalState.Succeeded;
        }
        if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        }
        if (_proposalSucceeded(proposal)) {
            return ProposalState.Succeeded;
        }
        return ProposalState.Defeated;
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory description,
        ProposalType proposalType,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 startTime,
        uint256 endTime,
        uint256 eta,
        bool executed,
        bool canceled
    ) {
        Proposal storage p = proposals[proposalId];
        return (
            p.id,
            p.proposer,
            p.description,
            p.proposalType,
            p.forVotes,
            p.againstVotes,
            p.startTime,
            p.endTime,
            p.eta,
            p.executed,
            p.canceled
        );
    }
    
    /**
     * @dev Check if user has voted on proposal
     */
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }
    
    /**
     * @dev Get user's voting power
     */
    function getVotingPower(address user) external view returns (uint256) {
        uint256 lxgBalance = lxgToken.balanceOf(user);
        uint256 trustScoreValue = trustScore.getTrustScore(user);
        return (lxgBalance / 10**18) + (trustScoreValue * 10);
    }
    
    /**
     * @dev Get all proposals by a user
     */
    function getUserProposals(address user) external view returns (uint256[] memory) {
        return userProposals[user];
    }
    
    /**
     * @dev Get voters for a proposal
     */
    function getProposalVoters(uint256 proposalId) external view returns (address[] memory) {
        return proposalVoters[proposalId];
    }
    
    /**
     * @dev Emergency pause the protocol
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Emergency unpause the protocol
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }
}
