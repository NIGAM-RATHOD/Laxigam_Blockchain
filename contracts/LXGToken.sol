// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LXGToken
 * @dev Laxigam native cryptocurrency (LXG)
 * 
 * Features:
 * - Total supply: 1,000,000,000 LXG
 * - Gas fee burn mechanism (50% burned, 50% to validator pool)
 * - Pausable for emergency situations
 * - Genesis block attribution to Laxigam Team
 * - Reentrancy protection on transfers
 * 
 * Created by Laxigam Team
 * Token Symbol: LXG (NOT ELXG - Critical!)
 */
contract LXGToken is ERC20, ERC20Burnable, Ownable, Pausable, ReentrancyGuard {
    /// @notice Total supply of LXG tokens (1 billion with 18 decimals)
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18;
    
    /// @notice Percentage of gas fees that are burned (50%)
    uint256 public burnPercentage = 50;
    
    /// @notice Maximum burn percentage allowed (100%)
    uint256 public constant MAX_BURN_PERCENTAGE = 100;
    
    /// @notice Address that receives non-burned gas fees (validator pool)
    address public validatorPool;
    
    /// @notice Mapping to track authorized minters (for deposit/withdraw functionality)
    mapping(address => bool) public authorizedMinters;
    
    /// @notice Treasury address for platform fees
    address public treasury;
    
    // Events
    event GenesisCreated(string creator, uint256 timestamp);
    event GasFeeBurned(address indexed from, uint256 amount);
    event BurnPercentageUpdated(uint256 oldPercentage, uint256 newPercentage);
    event ValidatorPoolUpdated(address indexed oldPool, address indexed newPool);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event MinterAuthorized(address indexed minter);
    event MinterRevoked(address indexed minter);
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensBurnedByMinter(address indexed from, uint256 amount, string reason);

    /**
     * @dev Constructor that mints all tokens to deployer and emits genesis event
     * Token Name: Laxigam
     * Token Symbol: LXG (CRITICAL: NOT ELXG!)
     */
    constructor(address _treasury) ERC20("Laxigam", "LXG") Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury address");
        
        _mint(msg.sender, INITIAL_SUPPLY);
        validatorPool = msg.sender;
        treasury = _treasury;
        
        // Authorize deployer as minter
        authorizedMinters[msg.sender] = true;
        
        emit GenesisCreated("Created by Laxigam Team", block.timestamp);
        emit MinterAuthorized(msg.sender);
    }
    
    modifier onlyAuthorizedMinter() {
        require(authorizedMinters[msg.sender], "Not authorized minter");
        _;
    }
    
    /**
     * @dev Mint tokens for deposit functionality (fiat to LXG conversion)
     * Only authorized minters can call this (backend after payment confirmation)
     */
    function mintForDeposit(address to, uint256 amount, string calldata reason) external onlyAuthorizedMinter whenNotPaused {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }
    
    /**
     * @dev Burn tokens for withdrawal functionality (LXG to fiat conversion)
     * Only authorized minters can call this (backend before fiat payout)
     */
    function burnForWithdrawal(address from, uint256 amount, string calldata reason) external onlyAuthorizedMinter whenNotPaused {
        require(from != address(0), "Invalid address");
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(from) >= amount, "Insufficient balance");
        
        _burn(from, amount);
        emit TokensBurnedByMinter(from, amount, reason);
    }
    
    /**
     * @dev Transfer tokens with automatic gas fee burn mechanism
     * 50% of gas fees burned (deflationary), 50% to validator pool
     */
    function transferWithBurn(
        address to, 
        uint256 amount, 
        uint256 gasFee
    ) public whenNotPaused nonReentrant returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(balanceOf(msg.sender) >= amount + gasFee, "Insufficient balance");
        
        uint256 burnAmount = (gasFee * burnPercentage) / 100;
        uint256 poolAmount = gasFee - burnAmount;
        
        if (burnAmount > 0) {
            _burn(msg.sender, burnAmount);
            emit GasFeeBurned(msg.sender, burnAmount);
        }
        
        if (poolAmount > 0) {
            _transfer(msg.sender, validatorPool, poolAmount);
        }
        
        _transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * @dev Update burn percentage (only owner)
     */
    function setBurnPercentage(uint256 newPercentage) external onlyOwner {
        require(newPercentage <= MAX_BURN_PERCENTAGE, "Exceeds maximum");
        uint256 oldPercentage = burnPercentage;
        burnPercentage = newPercentage;
        emit BurnPercentageUpdated(oldPercentage, newPercentage);
    }
    
    /**
     * @dev Update validator pool address (only owner)
     */
    function setValidatorPool(address newPool) external onlyOwner {
        require(newPool != address(0), "Invalid address");
        address oldPool = validatorPool;
        validatorPool = newPool;
        emit ValidatorPoolUpdated(oldPool, newPool);
    }
    
    /**
     * @dev Update treasury address (only owner)
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    /**
     * @dev Authorize a new minter (only owner)
     */
    function authorizeMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid address");
        authorizedMinters[minter] = true;
        emit MinterAuthorized(minter);
    }
    
    /**
     * @dev Revoke minter authorization (only owner)
     */
    function revokeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterRevoked(minter);
    }
    
    /**
     * @dev Emergency pause all transfers
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Prevent ownership renouncement for security
     */
    function renounceOwnership() public virtual override onlyOwner {
        revert("Renouncing ownership is disabled");
    }
    
    /**
     * @dev Get comprehensive token information
     */
    function getTokenInfo() external view returns (
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply,
        uint256 currentSupply,
        uint256 burnedAmount,
        uint256 currentBurnPercentage,
        address currentValidatorPool,
        address currentTreasury
    ) {
        tokenName = name();
        tokenSymbol = symbol();
        initialSupply = INITIAL_SUPPLY;
        currentSupply = totalSupply();
        burnedAmount = INITIAL_SUPPLY - totalSupply();
        currentBurnPercentage = burnPercentage;
        currentValidatorPool = validatorPool;
        currentTreasury = treasury;
    }
}
