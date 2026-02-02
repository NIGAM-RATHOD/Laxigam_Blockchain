// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title MediatorVault
 * @dev The Mediator Vault is the central escrow and conversion engine for LXG tokens.
 * 
 * It acts as a bridge between:
 * - Fiat Payments (UPI, PIX, QIWI, Alipay) -> LXG Tokens
 * - LXG Tokens -> Fiat Withdrawals
 * - Telegram Stars / TON -> LXG Tokens
 * 
 * The Mediator is controlled by an authorized backend oracle that confirms
 * off-chain payments before releasing on-chain LXG.
 * 
 * @author Laxigam Team
 */
contract MediatorVault is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;

    IERC20 public lxgToken;
    
    /// @notice Address of the backend oracle that can confirm payments
    address public paymentOracle;
    
    /// @notice Fee percentage for deposits (in basis points, e.g., 100 = 1%)
    uint256 public depositFeeBps = 50; // 0.5%
    
    /// @notice Fee percentage for withdrawals (in basis points)
    uint256 public withdrawalFeeBps = 100; // 1%
    
    /// @notice Treasury address for collected fees
    address public treasury;
    
    /// @notice Minimum deposit amount (in LXG, 18 decimals)
    uint256 public minDeposit = 10 * 10**18; // 10 LXG
    
    /// @notice Minimum withdrawal amount
    uint256 public minWithdrawal = 50 * 10**18; // 50 LXG
    
    /// @notice Daily withdrawal limit per user (in LXG)
    uint256 public dailyWithdrawalLimit = 10000 * 10**18; // 10,000 LXG
    
    /// @notice Tracks daily withdrawals per user
    mapping(address => uint256) public dailyWithdrawn;
    mapping(address => uint256) public lastWithdrawalDay;
    
    /// @notice Nonces to prevent replay attacks
    mapping(address => uint256) public nonces;
    
    /// @notice Pending deposit requests (payment_id => DepositRequest)
    mapping(bytes32 => DepositRequest) public pendingDeposits;
    
    /// @notice Pending withdrawal requests (request_id => WithdrawalRequest)
    mapping(bytes32 => WithdrawalRequest) public pendingWithdrawals;
    
    struct DepositRequest {
        address user;
        uint256 amountLXG;
        uint256 amountFiat;
        string currency;
        string paymentMethod;
        uint256 createdAt;
        bool fulfilled;
        bool cancelled;
    }
    
    struct WithdrawalRequest {
        address user;
        uint256 amountLXG;
        uint256 amountFiat;
        string currency;
        string destination;
        uint256 createdAt;
        bool processed;
        bool cancelled;
    }
    
    // Events
    event DepositInitiated(bytes32 indexed paymentId, address indexed user, uint256 amountLXG, string paymentMethod);
    event DepositFulfilled(bytes32 indexed paymentId, address indexed user, uint256 amountLXG, uint256 fee);
    event DepositCancelled(bytes32 indexed paymentId, address indexed user, string reason);
    
    event WithdrawalRequested(bytes32 indexed requestId, address indexed user, uint256 amountLXG, string destination);
    event WithdrawalProcessed(bytes32 indexed requestId, address indexed user, uint256 amountFiat);
    event WithdrawalCancelled(bytes32 indexed requestId, address indexed user, string reason);
    
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FeesUpdated(uint256 depositFeeBps, uint256 withdrawalFeeBps);
    event LimitsUpdated(uint256 minDeposit, uint256 minWithdrawal, uint256 dailyLimit);
    
    constructor(
        address _lxgToken,
        address _paymentOracle,
        address _treasury
    ) Ownable(msg.sender) {
        require(_lxgToken != address(0), "Invalid token address");
        require(_paymentOracle != address(0), "Invalid oracle address");
        require(_treasury != address(0), "Invalid treasury address");
        
        lxgToken = IERC20(_lxgToken);
        paymentOracle = _paymentOracle;
        treasury = _treasury;
    }
    
    modifier onlyOracle() {
        require(msg.sender == paymentOracle || msg.sender == owner(), "Not authorized");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // DEPOSIT FLOW: Fiat -> LXG
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Initiate a deposit request (called by backend when user starts payment)
     * @param paymentId Unique payment ID from payment gateway
     * @param user User's wallet address
     * @param amountLXG Amount of LXG to receive
     * @param amountFiat Amount paid in fiat
     * @param currency Currency code (INR, BRL, RUB, CNY, USD)
     * @param paymentMethod Payment method (UPI, PIX, QIWI, ALIPAY, STARS, TON)
     */
    function initiateDeposit(
        bytes32 paymentId,
        address user,
        uint256 amountLXG,
        uint256 amountFiat,
        string calldata currency,
        string calldata paymentMethod
    ) external onlyOracle whenNotPaused {
        require(user != address(0), "Invalid user address");
        require(amountLXG >= minDeposit, "Amount below minimum");
        require(!pendingDeposits[paymentId].user != address(0), "Payment ID already used");
        
        pendingDeposits[paymentId] = DepositRequest({
            user: user,
            amountLXG: amountLXG,
            amountFiat: amountFiat,
            currency: currency,
            paymentMethod: paymentMethod,
            createdAt: block.timestamp,
            fulfilled: false,
            cancelled: false
        });
        
        emit DepositInitiated(paymentId, user, amountLXG, paymentMethod);
    }
    
    /**
     * @dev Fulfill a deposit after payment is confirmed off-chain
     * @param paymentId The payment ID to fulfill
     */
    function fulfillDeposit(bytes32 paymentId) external onlyOracle nonReentrant whenNotPaused {
        DepositRequest storage request = pendingDeposits[paymentId];
        require(request.user != address(0), "Deposit not found");
        require(!request.fulfilled, "Already fulfilled");
        require(!request.cancelled, "Deposit cancelled");
        
        request.fulfilled = true;
        
        // Calculate fee
        uint256 fee = (request.amountLXG * depositFeeBps) / 10000;
        uint256 netAmount = request.amountLXG - fee;
        
        // Transfer LXG to user
        require(lxgToken.transfer(request.user, netAmount), "Transfer to user failed");
        
        // Transfer fee to treasury
        if (fee > 0) {
            require(lxgToken.transfer(treasury, fee), "Fee transfer failed");
        }
        
        emit DepositFulfilled(paymentId, request.user, netAmount, fee);
    }
    
    /**
     * @dev Cancel a pending deposit (if payment failed)
     */
    function cancelDeposit(bytes32 paymentId, string calldata reason) external onlyOracle {
        DepositRequest storage request = pendingDeposits[paymentId];
        require(request.user != address(0), "Deposit not found");
        require(!request.fulfilled, "Already fulfilled");
        require(!request.cancelled, "Already cancelled");
        
        request.cancelled = true;
        
        emit DepositCancelled(paymentId, request.user, reason);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // WITHDRAWAL FLOW: LXG -> Fiat
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Request a withdrawal (user locks LXG, backend processes fiat payout)
     * @param amountLXG Amount of LXG to withdraw
     * @param destination Payout destination (UPI ID, PIX key, QIWI phone, etc.)
     * @param currency Currency to withdraw to
     * @param amountFiat Expected fiat amount (calculated off-chain)
     * @param nonce Unique nonce for this request
     * @param signature Oracle signature approving this withdrawal
     */
    function requestWithdrawal(
        uint256 amountLXG,
        string calldata destination,
        string calldata currency,
        uint256 amountFiat,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        require(amountLXG >= minWithdrawal, "Amount below minimum");
        require(bytes(destination).length > 0, "Destination required");
        require(nonce == nonces[msg.sender], "Invalid nonce");
        
        // Verify signature from oracle
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,
            amountLXG,
            destination,
            currency,
            amountFiat,
            nonce
        ));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        require(signer == paymentOracle, "Invalid signature");
        
        // Check daily limit
        _resetDailyLimitIfNeeded(msg.sender);
        require(dailyWithdrawn[msg.sender] + amountLXG <= dailyWithdrawalLimit, "Daily limit exceeded");
        
        // Update nonce
        nonces[msg.sender]++;
        
        // Update daily tracking
        dailyWithdrawn[msg.sender] += amountLXG;
        
        // Transfer LXG from user to vault
        require(lxgToken.transferFrom(msg.sender, address(this), amountLXG), "Transfer failed");
        
        // Calculate fee
        uint256 fee = (amountLXG * withdrawalFeeBps) / 10000;
        
        // Transfer fee to treasury
        if (fee > 0) {
            require(lxgToken.transfer(treasury, fee), "Fee transfer failed");
        }
        
        // Create withdrawal request
        bytes32 requestId = keccak256(abi.encodePacked(msg.sender, amountLXG, block.timestamp, nonce));
        
        pendingWithdrawals[requestId] = WithdrawalRequest({
            user: msg.sender,
            amountLXG: amountLXG - fee,
            amountFiat: amountFiat,
            currency: currency,
            destination: destination,
            createdAt: block.timestamp,
            processed: false,
            cancelled: false
        });
        
        emit WithdrawalRequested(requestId, msg.sender, amountLXG - fee, destination);
    }
    
    /**
     * @dev Mark withdrawal as processed (after fiat payout is complete)
     */
    function processWithdrawal(bytes32 requestId) external onlyOracle {
        WithdrawalRequest storage request = pendingWithdrawals[requestId];
        require(request.user != address(0), "Withdrawal not found");
        require(!request.processed, "Already processed");
        require(!request.cancelled, "Withdrawal cancelled");
        
        request.processed = true;
        
        emit WithdrawalProcessed(requestId, request.user, request.amountFiat);
    }
    
    /**
     * @dev Cancel withdrawal and refund LXG (if payout failed)
     */
    function cancelWithdrawal(bytes32 requestId, string calldata reason) external onlyOracle nonReentrant {
        WithdrawalRequest storage request = pendingWithdrawals[requestId];
        require(request.user != address(0), "Withdrawal not found");
        require(!request.processed, "Already processed");
        require(!request.cancelled, "Already cancelled");
        
        request.cancelled = true;
        
        // Refund LXG to user
        require(lxgToken.transfer(request.user, request.amountLXG), "Refund failed");
        
        emit WithdrawalCancelled(requestId, request.user, reason);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function _resetDailyLimitIfNeeded(address user) internal {
        uint256 currentDay = block.timestamp / 1 days;
        if (lastWithdrawalDay[user] < currentDay) {
            dailyWithdrawn[user] = 0;
            lastWithdrawalDay[user] = currentDay;
        }
    }
    
    /**
     * @dev Get user's remaining daily withdrawal limit
     */
    function getRemainingDailyLimit(address user) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        if (lastWithdrawalDay[user] < currentDay) {
            return dailyWithdrawalLimit;
        }
        if (dailyWithdrawn[user] >= dailyWithdrawalLimit) {
            return 0;
        }
        return dailyWithdrawalLimit - dailyWithdrawn[user];
    }
    
    /**
     * @dev Get deposit request details
     */
    function getDepositRequest(bytes32 paymentId) external view returns (DepositRequest memory) {
        return pendingDeposits[paymentId];
    }
    
    /**
     * @dev Get withdrawal request details
     */
    function getWithdrawalRequest(bytes32 requestId) external view returns (WithdrawalRequest memory) {
        return pendingWithdrawals[requestId];
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function setOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid address");
        emit OracleUpdated(paymentOracle, newOracle);
        paymentOracle = newOracle;
    }
    
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid address");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }
    
    function setFees(uint256 _depositFeeBps, uint256 _withdrawalFeeBps) external onlyOwner {
        require(_depositFeeBps <= 500, "Deposit fee too high"); // Max 5%
        require(_withdrawalFeeBps <= 500, "Withdrawal fee too high"); // Max 5%
        depositFeeBps = _depositFeeBps;
        withdrawalFeeBps = _withdrawalFeeBps;
        emit FeesUpdated(_depositFeeBps, _withdrawalFeeBps);
    }
    
    function setLimits(uint256 _minDeposit, uint256 _minWithdrawal, uint256 _dailyLimit) external onlyOwner {
        minDeposit = _minDeposit;
        minWithdrawal = _minWithdrawal;
        dailyWithdrawalLimit = _dailyLimit;
        emit LimitsUpdated(_minDeposit, _minWithdrawal, _dailyLimit);
    }
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    /**
     * @dev Emergency withdrawal of LXG (owner only)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(lxgToken.transfer(owner(), amount), "Emergency withdraw failed");
    }
    
    /**
     * @dev Deposit LXG into the vault (to provide liquidity)
     */
    function depositLiquidity(uint256 amount) external onlyOwner {
        require(lxgToken.transferFrom(msg.sender, address(this), amount), "Liquidity deposit failed");
    }
    
    /**
     * @dev Get vault balance
     */
    function getVaultBalance() external view returns (uint256) {
        return lxgToken.balanceOf(address(this));
    }
}
