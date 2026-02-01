// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./AIValidator.sol";
import "./TrustScore.sol";

/**
 * @title GameBridge
 * @dev Bridge between real-world wallets and game economies
 * 
 * Features:
 * - Dual wallet system: Real World vs Game World
 * - AI validation before transfers
 * - Escrow for large amounts (>10,000 LXG)
 * - Per-game balance tracking
 * - Transaction history
 * - Trust score integration
 */
contract GameBridge is Ownable, ReentrancyGuard, Pausable {
    IERC20 public lxgToken;
    TrustScore public trustScore;
    AIValidator public aiValidator;

    /// @notice User's game wallet balances (user => game => balance)
    mapping(address => mapping(string => uint256)) public gameBalances;
    
    /// @notice Total game balance across all games per user
    mapping(address => uint256) public totalGameBalance;
    
    struct EscrowItem {
        uint256 amount;
        uint256 releaseTime;
        bool active;
        string gameName;
        address user;
        string reason; // Reason for escrow (AI flag, large amount, etc.)
    }
    
    /// @notice Escrow mapping: escrowId => EscrowItem
    mapping(uint256 => EscrowItem) public escrows;
    uint256 public nextEscrowId = 1;
    
    /// @notice User's active escrow IDs
    mapping(address => uint256[]) public userEscrows;

    struct Transaction {
        uint256 amount;
        string gameName;
        uint256 timestamp;
        bool isDeposit; // true = deposit to game, false = withdraw to wallet
        string txType; // "deposit", "withdraw", "game_transfer", "p2p"
        uint256 escrowId; // 0 if no escrow
        bool completed;
    }
    
    /// @notice User transaction history
    mapping(address => Transaction[]) private userHistory;

    /// @notice Escrow threshold: amounts >= this value trigger escrow
    uint256 public escrowThreshold = 10000 * 10**18;
    
    /// @notice Escrow duration in seconds (24 hours)
    uint256 public escrowDuration = 24 hours;
    
    /// @notice Minimum trust score required for transactions
    uint256 public minTrustScore = 30;
    
    /// @notice Registered games
    mapping(string => bool) public registeredGames;
    mapping(string => address) public gameDevelopers;
    mapping(string => uint256) public gameVolume;
    mapping(string => uint256) public gameFeesCollected;

    // Events
    event DepositToGame(address indexed user, uint256 amount, string game, uint256 timestamp, uint256 escrowId);
    event WithdrawToWallet(address indexed user, uint256 amount, string game, uint256 timestamp);
    event GameTransfer(address indexed from, address indexed to, uint256 amount, string fromGame, string toGame);
    event EscrowCreated(uint256 indexed escrowId, address indexed user, uint256 amount, uint256 releaseTime, string reason);
    event EscrowReleased(uint256 indexed escrowId, address indexed user, uint256 amount);
    event EscrowCancelled(uint256 indexed escrowId, address indexed user, string reason);
    event GameRegistered(string gameName, address indexed developer, uint256 timestamp);
    event GameDeregistered(string gameName, uint256 timestamp);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event DurationUpdated(uint256 oldDuration, uint256 newDuration);
    event MinTrustScoreUpdated(uint256 oldScore, uint256 newScore);

    constructor(address _lxgToken, address _trustScore, address _aiValidator) Ownable(msg.sender) {
        require(_lxgToken != address(0), "Invalid token address");
        require(_trustScore != address(0), "Invalid trust score address");
        require(_aiValidator != address(0), "Invalid AI validator address");
        
        lxgToken = IERC20(_lxgToken);
        trustScore = TrustScore(_trustScore);
        aiValidator = AIValidator(_aiValidator);
    }

    /**
     * @dev Register a new game for integration
     */
    function registerGame(string memory gameName, address developer) external onlyOwner {
        require(bytes(gameName).length > 0, "Game name required");
        require(developer != address(0), "Invalid developer address");
        require(!registeredGames[gameName], "Game already registered");
        
        registeredGames[gameName] = true;
        gameDevelopers[gameName] = developer;
        
        emit GameRegistered(gameName, developer, block.timestamp);
    }
    
    /**
     * @dev Deregister a game
     */
    function deregisterGame(string memory gameName) external onlyOwner {
        require(registeredGames[gameName], "Game not registered");
        
        registeredGames[gameName] = false;
        delete gameDevelopers[gameName];
        
        emit GameDeregistered(gameName, block.timestamp);
    }

    /**
     * @dev Deposit LXG from real wallet to game wallet
     * Requires AI validation and trust score check
     */
    function depositToGame(uint256 amount, string memory gameName, uint256 nonce, bytes memory signature) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(registeredGames[gameName], "Game not registered");
        require(trustScore.isEligible(msg.sender, amount), "Insufficient Trust Score");
        
        // AI validation (Signed)
        bool approved = aiValidator.validateSignedTransaction(
            msg.sender, 
            amount, 
            nonce,
            signature
        );
        require(approved, "Invalid Signature or Unauthorized Transaction");

        // Transfer tokens from user to this contract
        require(lxgToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Check if escrow is needed
        if (amount >= escrowThreshold || confidence < 80) {
            uint256 escrowId = nextEscrowId++;
            string memory escrowReason = amount >= escrowThreshold ? "Large amount" : "Low AI confidence";
            
            escrows[escrowId] = EscrowItem({
                amount: amount,
                releaseTime: block.timestamp + escrowDuration,
                active: true,
                gameName: gameName,
                user: msg.sender,
                reason: escrowReason
            });
            
            userEscrows[msg.sender].push(escrowId);
            
            emit EscrowCreated(escrowId, msg.sender, amount, escrows[escrowId].releaseTime, escrowReason);
        } else {
            // Direct deposit
            gameBalances[msg.sender][gameName] += amount;
            totalGameBalance[msg.sender] += amount;
            gameVolume[gameName] += amount;
            trustScore.incrementTransactionCount(msg.sender);
            
            emit DepositToGame(msg.sender, amount, gameName, block.timestamp, 0);
        }

        userHistory[msg.sender].push(Transaction(amount, gameName, block.timestamp, true, "deposit", 0, true));
    }
    
    /**
     * @dev Release escrowed funds to game wallet
     */
    function releaseEscrow(uint256 escrowId) external nonReentrant {
        EscrowItem storage item = escrows[escrowId];
        require(item.active, "No active escrow");
        require(item.user == msg.sender || msg.sender == owner(), "Not authorized");
        require(block.timestamp >= item.releaseTime, "Escrow period not over");
        
        uint256 amount = item.amount;
        string memory gameName = item.gameName;
        address user = item.user;
        
        item.active = false;
        
        gameBalances[user][gameName] += amount;
        totalGameBalance[user] += amount;
        gameVolume[gameName] += amount;
        trustScore.incrementTransactionCount(user);
        
        emit EscrowReleased(escrowId, user, amount);
        emit DepositToGame(user, amount, gameName, block.timestamp, escrowId);
    }
    
    /**
     * @dev Cancel escrow and return funds to user (owner only - for fraud cases)
     */
    function cancelEscrow(uint256 escrowId, string calldata reason) external onlyOwner nonReentrant {
        EscrowItem storage item = escrows[escrowId];
        require(item.active, "No active escrow");
        
        uint256 amount = item.amount;
        address user = item.user;
        item.active = false;
        
        // Return tokens to user
        require(lxgToken.transfer(user, amount), "Refund transfer failed");
        
        emit EscrowCancelled(escrowId, user, reason);
    }

    /**
     * @dev Withdraw LXG from game wallet to real wallet
     */
    function withdrawToWallet(uint256 amount, string memory gameName) external whenNotPaused nonReentrant {
        require(gameBalances[msg.sender][gameName] >= amount, "Insufficient game balance");
        require(amount > 0, "Amount must be > 0");
        
        // AI validation for withdrawal
        (bool approved, , string memory reason) = aiValidator.validateTransaction(
            address(this),
            msg.sender, 
            amount, 
            trustScore.getTrustScore(msg.sender)
        );
        require(approved, string(abi.encodePacked("AI validation failed: ", reason)));
        
        gameBalances[msg.sender][gameName] -= amount;
        totalGameBalance[msg.sender] -= amount;
        
        require(lxgToken.transfer(msg.sender, amount), "Transfer failed");
        
        trustScore.incrementTransactionCount(msg.sender);
        userHistory[msg.sender].push(Transaction(amount, gameName, block.timestamp, false, "withdraw", 0, true));
        
        emit WithdrawToWallet(msg.sender, amount, gameName, block.timestamp);
    }
    
    /**
     * @dev Transfer between games (same user)
     */
    function transferBetweenGames(uint256 amount, string memory fromGame, string memory toGame) external whenNotPaused nonReentrant {
        require(registeredGames[fromGame] && registeredGames[toGame], "Game not registered");
        require(gameBalances[msg.sender][fromGame] >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be > 0");
        
        gameBalances[msg.sender][fromGame] -= amount;
        gameBalances[msg.sender][toGame] += amount;
        
        trustScore.incrementTransactionCount(msg.sender);
        userHistory[msg.sender].push(Transaction(amount, toGame, block.timestamp, true, "game_transfer", 0, true));
        
        emit GameTransfer(msg.sender, msg.sender, amount, fromGame, toGame);
    }
    
    /**
     * @dev P2P transfer within same game
     */
    function p2pTransfer(address to, uint256 amount, string memory gameName) external whenNotPaused nonReentrant {
        require(registeredGames[gameName], "Game not registered");
        require(gameBalances[msg.sender][gameName] >= amount, "Insufficient balance");
        require(to != address(0) && to != msg.sender, "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(trustScore.isEligible(msg.sender, amount), "Insufficient Trust Score");
        
        gameBalances[msg.sender][gameName] -= amount;
        gameBalances[to][gameName] += amount;
        
        trustScore.incrementTransactionCount(msg.sender);
        trustScore.incrementTransactionCount(to);
        
        userHistory[msg.sender].push(Transaction(amount, gameName, block.timestamp, false, "p2p", 0, true));
        userHistory[to].push(Transaction(amount, gameName, block.timestamp, true, "p2p", 0, true));
        
        emit GameTransfer(msg.sender, to, amount, gameName, gameName);
    }

    /**
     * @dev Get user's transaction history
     */
    function getTransactionHistory(address user) external view returns (Transaction[] memory) {
        return userHistory[user];
    }
    
    /**
     * @dev Get user's balance breakdown
     */
    function getBalance(address user) external view returns (
        uint256 realBalance, 
        uint256 totalGameBal,
        uint256 escrowedAmount
    ) {
        realBalance = lxgToken.balanceOf(user);
        totalGameBal = totalGameBalance[user];
        
        // Calculate escrowed amount
        escrowedAmount = 0;
        uint256[] storage userEscrowIds = userEscrows[user];
        for (uint i = 0; i < userEscrowIds.length; i++) {
            EscrowItem storage item = escrows[userEscrowIds[i]];
            if (item.active) {
                escrowedAmount += item.amount;
            }
        }
    }
    
    /**
     * @dev Get user's balance for a specific game
     */
    function getGameBalance(address user, string memory gameName) external view returns (uint256) {
        return gameBalances[user][gameName];
    }
    
    /**
     * @dev Get user's active escrows
     */
    function getUserEscrows(address user) external view returns (uint256[] memory) {
        return userEscrows[user];
    }
    
    /**
     * @dev Get escrow details
     */
    function getEscrowDetails(uint256 escrowId) external view returns (EscrowItem memory) {
        return escrows[escrowId];
    }

    /**
     * @dev Update escrow threshold
     */
    function setEscrowThreshold(uint256 newThreshold) external onlyOwner {
        uint256 oldThreshold = escrowThreshold;
        escrowThreshold = newThreshold;
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /**
     * @dev Update escrow duration
     */
    function setEscrowDuration(uint256 newDuration) external onlyOwner {
        uint256 oldDuration = escrowDuration;
        escrowDuration = newDuration;
        emit DurationUpdated(oldDuration, newDuration);
    }
    
    /**
     * @dev Update minimum trust score
     */
    function setMinTrustScore(uint256 newScore) external onlyOwner {
        uint256 oldScore = minTrustScore;
        minTrustScore = newScore;
        emit MinTrustScoreUpdated(oldScore, newScore);
    }

    /**
     * @dev Update contract addresses
     */
    function setContracts(address _trustScore, address _aiValidator) external onlyOwner {
        require(_trustScore != address(0), "Invalid trust score address");
        require(_aiValidator != address(0), "Invalid AI validator address");
        trustScore = TrustScore(_trustScore);
        aiValidator = AIValidator(_aiValidator);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @dev Emergency withdrawal (owner only)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(lxgToken), "Cannot withdraw LXG");
        IERC20(token).transfer(owner(), amount);
    }
}
