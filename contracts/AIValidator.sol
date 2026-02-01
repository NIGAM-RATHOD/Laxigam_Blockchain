// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title IAIValidator
 * @dev Interface for AI Validator
 */
interface IAIValidator {
    function validateTransaction(
        address sender, 
        address receiver, 
        uint256 amount, 
        uint256 trustScore
    ) external view returns (bool approved, uint256 confidence, string memory reason);
    
    function generatePINHash(address user, bytes32 pinHash) external;
    function verifyPIN(address user, uint256 pin) external returns (bool);
    function getValidatorStatus() external view returns (bool online);
}

/**
 * @title AIValidator
 * @dev AI-powered transaction validation contract
 * 
 * Features:
 * - Dual AI consensus (Gemini + Claude) via oracle
 * - Dynamic PIN generation for transaction security
 * - Fallback heuristics when AI is offline
 * - Oracle-based AI integration
 */
contract AIValidator is IAIValidator, Ownable, Pausable {
    
    struct PINData {
        bytes32 pinHash;
        uint256 createdAt;
        uint256 expiresAt;
        bool used;
    }
    
    mapping(address => PINData) public userPINs;
    mapping(address => uint256) public lastPINGeneration;
    mapping(address => uint256) public consecutiveFailedAttempts;
    
    uint256 public constant PIN_VALIDITY = 10 minutes;
    uint256 public constant PIN_COOLDOWN = 30 seconds;
    uint256 public constant MAX_FAILED_ATTEMPTS = 3;
    uint256 public constant LOCKOUT_DURATION = 30 minutes;
    
    address public oracleAddress;
    bool public isAIOnline = true;
    
    // Fallback heuristic parameters
    uint256 public maxAmountMultiplier = 10; // Max amount = trustScore * 10 * 10^18
    uint256 public minTrustScoreForLargeTx = 10;
    uint256 public largeTxThreshold = 10000 * 10**18;
    
    // Events
    event ValidationRequested(address indexed sender, address indexed receiver, uint256 amount);
    event ValidationCompleted(address indexed sender, bool approved, uint256 confidence, string reason);
    event PINGenerated(address indexed user, uint256 expiresAt);
    event PINVerified(address indexed user, bool success);
    event PINExpired(address indexed user);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event AIStatusChanged(bool online);
    event FallbackParamsUpdated(uint256 maxMultiplier, uint256 minTrustScore, uint256 largeTxThreshold);
    event AccountLocked(address indexed user, uint256 unlockTime);

    constructor(address _oracle) Ownable(msg.sender) {
        require(_oracle != address(0), "Invalid oracle address");
        oracleAddress = _oracle;
    }

    modifier onlyOracle() {
        require(msg.sender == oracleAddress || msg.sender == owner(), "Not authorized oracle");
        _;
    }

    using ECDSA for bytes32;

    function validateSignedTransaction(
        address sender,
        uint256 amount,
        uint256 nonce,
        bytes memory signature
    ) external view returns (bool) {
        // Recreate the message hash that was signed off-chain
        bytes32 messageHash = keccak256(abi.encodePacked(sender, amount, nonce));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        
        return recoveredSigner == oracleAddress;
    }
    
    modifier notLocked(address user) {
        uint256 lockoutEnd = lastPINGeneration[user] + LOCKOUT_DURATION;
        require(
            consecutiveFailedAttempts[user] < MAX_FAILED_ATTEMPTS || 
            block.timestamp >= lockoutEnd,
            "Account temporarily locked"
        );
        _;
    }

    /**
     * @dev Validate a transaction using AI (via oracle) or fallback heuristics
     */
    function validateTransaction(
        address sender, 
        address receiver, 
        uint256 amount, 
        uint256 trustScore
    ) external view override returns (bool approved, uint256 confidence, string memory reason) {
        emit ValidationRequested(sender, receiver, amount);
        
        if (isAIOnline) {
            // When AI is online, return optimistic approval
            // Real validation happens off-chain via oracle
            return (true, 95, "Awaiting off-chain AI validation");
        } else {
            // Fallback heuristics when AI is offline
            return _fallbackValidation(sender, receiver, amount, trustScore);
        }
    }
    
    /**
     * @dev Internal fallback validation logic
     */
    function _fallbackValidation(
        address sender, 
        address receiver, 
        uint256 amount, 
        uint256 trustScore
    ) internal view returns (bool approved, uint256 confidence, string memory reason) {
        // Check 1: Amount exceeds threshold based on trust score
        uint256 maxAmount = trustScore * maxAmountMultiplier * 10**18;
        if (amount > maxAmount) {
            return (false, 85, "Amount exceeds trust-based limit (AI Offline)");
        }
        
        // Check 2: Trust score too low
        if (trustScore < minTrustScoreForLargeTx && amount > 100 * 10**18) {
            return (false, 90, "Trust score too low for this amount (AI Offline)");
        }
        
        // Check 3: Very large transactions need review
        if (amount >= largeTxThreshold) {
            return (false, 75, "Large transaction requires AI review");
        }
        
        // Check 4: Small transactions auto-approved
        if (amount <= 100 * 10**18) {
            return (true, 80, "Small amount auto-approved (AI Offline)");
        }
        
        // Default: Approve with medium confidence
        return (true, 70, "Approved by heuristic fallback");
    }

    /**
     * @dev Generate PIN hash for a user (called by oracle)
     */
    function generatePINHash(address user, bytes32 pinHash) external override onlyOracle {
        require(block.timestamp >= lastPINGeneration[user] + PIN_COOLDOWN, "PIN generation cooldown");
        
        uint256 expiresAt = block.timestamp + PIN_VALIDITY;
        
        userPINs[user] = PINData({
            pinHash: pinHash,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            used: false
        });
        
        lastPINGeneration[user] = block.timestamp;
        
        emit PINGenerated(user, expiresAt);
    }

    /**
     * @dev Verify PIN submitted by user
     */
    function verifyPIN(address user, uint256 pin) external override notLocked(user) returns (bool) {
        PINData storage pinData = userPINs[user];
        
        // Check if PIN exists
        if (pinData.pinHash == bytes32(0)) {
            consecutiveFailedAttempts[user]++;
            emit PINVerified(user, false);
            return false;
        }
        
        // Check if PIN expired
        if (block.timestamp > pinData.expiresAt) {
            delete userPINs[user];
            consecutiveFailedAttempts[user]++;
            emit PINExpired(user);
            emit PINVerified(user, false);
            return false;
        }
        
        // Check if PIN already used
        if (pinData.used) {
            consecutiveFailedAttempts[user]++;
            emit PINVerified(user, false);
            return false;
        }
        
        // Verify PIN hash
        bytes32 hashedPIN = keccak256(abi.encodePacked(pin));
        bool success = (pinData.pinHash == hashedPIN);
        
        if (success) {
            pinData.used = true;
            consecutiveFailedAttempts[user] = 0; // Reset on success
        } else {
            consecutiveFailedAttempts[user]++;
            
            // Lock account if too many failed attempts
            if (consecutiveFailedAttempts[user] >= MAX_FAILED_ATTEMPTS) {
                emit AccountLocked(user, block.timestamp + LOCKOUT_DURATION);
            }
        }
        
        emit PINVerified(user, success);
        return success;
    }
    
    /**
     * @dev Check if user has a valid, unused PIN
     */
    function hasValidPIN(address user) external view returns (bool) {
        PINData storage pinData = userPINs[user];
        return (
            pinData.pinHash != bytes32(0) && 
            !pinData.used && 
            block.timestamp <= pinData.expiresAt
        );
    }
    
    /**
     * @dev Get PIN status for a user
     */
    function getPINStatus(address user) external view returns (
        bool hasPIN,
        bool isValid,
        bool isUsed,
        uint256 expiresAt,
        uint256 remainingTime
    ) {
        PINData storage pinData = userPINs[user];
        hasPIN = pinData.pinHash != bytes32(0);
        isUsed = pinData.used;
        expiresAt = pinData.expiresAt;
        isValid = hasPIN && !isUsed && block.timestamp <= expiresAt;
        remainingTime = isValid ? expiresAt - block.timestamp : 0;
    }

    /**
     * @dev Get validator status
     */
    function getValidatorStatus() external view override returns (bool) {
        return isAIOnline;
    }
    
    /**
     * @dev Get account lock status
     */
    function getAccountLockStatus(address user) external view returns (
        bool isLocked,
        uint256 failedAttempts,
        uint256 unlockTime
    ) {
        failedAttempts = consecutiveFailedAttempts[user];
        uint256 lockoutEnd = lastPINGeneration[user] + LOCKOUT_DURATION;
        isLocked = failedAttempts >= MAX_FAILED_ATTEMPTS && block.timestamp < lockoutEnd;
        unlockTime = isLocked ? lockoutEnd : 0;
    }

    /**
     * @dev Set oracle address
     */
    function setOracleAddress(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid address");
        emit OracleUpdated(oracleAddress, newOracle);
        oracleAddress = newOracle;
    }

    /**
     * @dev Set AI online/offline status
     */
    function setAIStatus(bool online) external onlyOwner {
        isAIOnline = online;
        emit AIStatusChanged(online);
    }
    
    /**
     * @dev Update fallback heuristic parameters
     */
    function setFallbackParams(
        uint256 _maxMultiplier,
        uint256 _minTrustScore,
        uint256 _largeTxThreshold
    ) external onlyOwner {
        maxAmountMultiplier = _maxMultiplier;
        minTrustScoreForLargeTx = _minTrustScore;
        largeTxThreshold = _largeTxThreshold;
        
        emit FallbackParamsUpdated(_maxMultiplier, _minTrustScore, _largeTxThreshold);
    }
    
    /**
     * @dev Reset failed attempts for a user (owner only)
     */
    function resetFailedAttempts(address user) external onlyOwner {
        consecutiveFailedAttempts[user] = 0;
    }
    
    /**
     * @dev Clear expired PINs (gas optimization)
     */
    function clearExpiredPIN(address user) external {
        PINData storage pinData = userPINs[user];
        require(pinData.expiresAt < block.timestamp, "PIN not expired");
        delete userPINs[user];
        emit PINExpired(user);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
