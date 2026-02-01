// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./LXGToken.sol";
import "./TrustScore.sol";

/**
 * @title NFTMarketplace
 * @dev Marketplace for trading in-game items as NFTs
 * 
 * Features:
 * - Support ERC-721 (unique items) and ERC-1155 (fungible items)
 * - Mint game items as NFTs
 * - List/buy NFTs with LXG
 * - Royalty distribution (5% platform, 5% creator, 90% seller)
 * - Cross-game NFT bridge
 */
contract NFTMarketplace is Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _itemIds;
    Counters.Counter private _itemsSold;
    
    LXGToken public lxgToken;
    TrustScore public trustScore;
    
    uint256 public constant PLATFORM_FEE = 500; // 5% (basis points)
    uint256 public constant CREATOR_ROYALTY = 500; // 5% (basis points)
    uint256 public constant TOTAL_FEE = 1000; // 10% total
    uint256 public constant BASIS_POINTS = 10000;
    
    uint256 public minListingPrice = 1 * 10**18; // 1 LXG minimum
    
    struct MarketItem {
        uint256 itemId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        address payable creator;
        uint256 price;
        bool sold;
        string gameName;
        string itemType; // "weapon", "skin", "currency", etc.
    }
    
    struct GameNFT {
        string gameName;
        string metadata;
        bool isUnique; // ERC-721 if true, ERC-1155 if false
        uint256 supply; // For ERC-1155
        address originalContract; // For imported NFTs
    }
    
    mapping(uint256 => MarketItem) public idToMarketItem;
    mapping(address => mapping(uint256 => uint256)) public tokenToItemId;
    mapping(uint256 => GameNFT) public itemGameData;
    mapping(address => bool) public authorizedGames;
    mapping(address => uint256) public creatorEarnings;
    mapping(address => uint256) public pendingWithdrawals;
    
    // Cross-chain bridge
    mapping(uint256 => bool) public bridgedItems;
    mapping(address => bool) public authorizedBridges;
    
    // Events
    event ItemListed(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        string gameName
    );
    
    event ItemSold(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price
    );
    
    event ItemDelisted(uint256 indexed itemId);
    event PriceUpdated(uint256 indexed itemId, uint256 newPrice);
    
    event GameItemMinted(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed creator,
        string gameName,
        bool isUnique
    );
    
    event NFTImported(
        address indexed externalContract,
        uint256 indexed externalTokenId,
        uint256 indexed newItemId
    );
    
    event NFTExported(
        uint256 indexed itemId,
        address indexed destinationChain,
        address indexed owner
    );
    
    event EarningsWithdrawn(address indexed creator, uint256 amount);

    constructor(address _lxgToken, address _trustScore) Ownable(msg.sender) {
        require(_lxgToken != address(0), "Invalid token address");
        require(_trustScore != address(0), "Invalid trust score address");
        lxgToken = LXGToken(_lxgToken);
        trustScore = TrustScore(_trustScore);
    }
    
    /**
     * @dev Authorize a game to mint NFTs
     */
    function authorizeGame(address gameContract) external onlyOwner {
        authorizedGames[gameContract] = true;
    }
    
    /**
     * @dev Revoke game authorization
     */
    function revokeGame(address gameContract) external onlyOwner {
        authorizedGames[gameContract] = false;
    }
    
    /**
     * @dev Authorize a bridge contract
     */
    function authorizeBridge(address bridgeContract) external onlyOwner {
        authorizedBridges[bridgeContract] = true;
    }

    /**
     * @dev Mint a new game item as NFT
     */
    function mintGameItem(
        string memory name,
        string memory gameName,
        string memory metadata,
        bool isUnique,
        uint256 supply, // For ERC-1155, ignored for ERC-721
        address to
    ) external whenNotPaused nonReentrant returns (address nftContract, uint256 tokenId) {
        require(authorizedGames[msg.sender] || msg.sender == owner(), "Not authorized");
        require(bytes(name).length > 0, "Name required");
        require(bytes(gameName).length > 0, "Game name required");
        require(to != address(0), "Invalid recipient");
        
        if (isUnique) {
            // ERC-721 unique item
            // Note: In production, you'd deploy a new ERC721 contract per game
            // or use a factory pattern
            tokenId = uint256(keccak256(abi.encodePacked(gameName, name, block.timestamp)));
            nftContract = address(this); // Placeholder - would be actual NFT contract
        } else {
            // ERC-1155 fungible item
            require(supply > 0, "Supply required for ERC-1155");
            tokenId = uint256(keccak256(abi.encodePacked(gameName, name)));
            nftContract = address(this); // Placeholder
        }
        
        // Record game data
        _itemIds.increment();
        uint256 itemId = _itemIds.current();
        
        itemGameData[itemId] = GameNFT({
            gameName: gameName,
            metadata: metadata,
            isUnique: isUnique,
            supply: isUnique ? 1 : supply,
            originalContract: address(0)
        });
        
        // Update trust score for creator
        trustScore.recordNFTSale(to);
        
        emit GameItemMinted(nftContract, tokenId, to, gameName, isUnique);
        
        return (nftContract, tokenId);
    }

    /**
     * @dev List an NFT for sale
     */
    function listForSale(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        string memory gameName
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(price >= minListingPrice, "Price below minimum");
        require(authorizedGames[nftContract] || nftContract == address(this), "Unauthorized NFT");
        
        // Check if already listed
        require(tokenToItemId[nftContract][tokenId] == 0, "Already listed");
        
        _itemIds.increment();
        uint256 itemId = _itemIds.current();
        
        idToMarketItem[itemId] = MarketItem(
            itemId,
            nftContract,
            tokenId,
            payable(msg.sender),
            payable(msg.sender), // Creator is initially the seller
            price,
            false,
            gameName,
            "item"
        );
        
        tokenToItemId[nftContract][tokenId] = itemId;
        
        emit ItemListed(itemId, nftContract, tokenId, msg.sender, price, gameName);
        
        return itemId;
    }
    
    /**
     * @dev Update listing price
     */
    function updatePrice(uint256 itemId, uint256 newPrice) external whenNotPaused {
        require(newPrice >= minListingPrice, "Price below minimum");
        MarketItem storage item = idToMarketItem[itemId];
        require(item.seller == msg.sender, "Not seller");
        require(!item.sold, "Already sold");
        
        item.price = newPrice;
        emit PriceUpdated(itemId, newPrice);
    }
    
    /**
     * @dev Delist an item
     */
    function delistItem(uint256 itemId) external whenNotPaused {
        MarketItem storage item = idToMarketItem[itemId];
        require(item.seller == msg.sender || msg.sender == owner(), "Not authorized");
        require(!item.sold, "Already sold");
        
        delete tokenToItemId[item.nftContract][item.tokenId];
        delete idToMarketItem[itemId];
        
        emit ItemDelisted(itemId);
    }

    /**
     * @dev Buy an NFT with LXG
     */
    function buyNFT(uint256 itemId) external whenNotPaused nonReentrant {
        MarketItem storage item = idToMarketItem[itemId];
        require(item.itemId > 0, "Item not found");
        require(!item.sold, "Already sold");
        require(msg.sender != item.seller, "Cannot buy own item");
        
        uint256 price = item.price;
        require(lxgToken.balanceOf(msg.sender) >= price, "Insufficient balance");
        
        // Calculate fees
        uint256 platformFee = (price * PLATFORM_FEE) / BASIS_POINTS;
        uint256 creatorFee = (price * CREATOR_ROYALTY) / BASIS_POINTS;
        uint256 sellerAmount = price - platformFee - creatorFee;
        
        // Transfer LXG from buyer
        require(lxgToken.transferFrom(msg.sender, address(this), price), "Payment failed");
        
        // Distribute funds
        pendingWithdrawals[item.seller] += sellerAmount;
        pendingWithdrawals[item.creator] += creatorFee;
        pendingWithdrawals[owner()] += platformFee;
        
        // Mark as sold
        item.sold = true;
        _itemsSold.increment();
        
        // Update trust scores
        trustScore.incrementTransactionCount(msg.sender);
        trustScore.incrementTransactionCount(item.seller);
        
        emit ItemSold(itemId, item.nftContract, item.tokenId, item.seller, msg.sender, price);
    }
    
    /**
     * @dev Withdraw pending earnings
     */
    function withdrawEarnings() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No earnings to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        require(lxgToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit EarningsWithdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Get pending earnings
     */
    function getPendingEarnings(address user) external view returns (uint256) {
        return pendingWithdrawals[user];
    }

    /**
     * @dev Import NFT from external contract (cross-game bridge)
     */
    function importNFT(
        address externalContract,
        uint256 externalTokenId,
        string memory gameName
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(authorizedBridges[msg.sender] || msg.sender == owner(), "Not authorized bridge");
        
        _itemIds.increment();
        uint256 itemId = _itemIds.current();
        
        // Create wrapped representation
        idToMarketItem[itemId] = MarketItem(
            itemId,
            externalContract,
            externalTokenId,
            payable(msg.sender),
            payable(msg.sender),
            0, // Not for sale initially
            false,
            gameName,
            "imported"
        );
        
        itemGameData[itemId] = GameNFT({
            gameName: gameName,
            metadata: "",
            isUnique: true,
            supply: 1,
            originalContract: externalContract
        });
        
        bridgedItems[itemId] = true;
        
        emit NFTImported(externalContract, externalTokenId, itemId);
        
        return itemId;
    }
    
    /**
     * @dev Export NFT to another chain/game
     */
    function exportNFT(
        uint256 itemId,
        address destinationChain
    ) external whenNotPaused nonReentrant {
        MarketItem storage item = idToMarketItem[itemId];
        require(item.seller == msg.sender, "Not owner");
        require(destinationChain != address(0), "Invalid destination");
        
        // Mark as exported (burn or lock logic would go here)
        item.sold = true; // Mark as no longer available on this marketplace
        
        emit NFTExported(itemId, destinationChain, msg.sender);
    }

    /**
     * @dev Get all active listings
     */
    function fetchMarketItems() external view returns (MarketItem[] memory) {
        uint256 itemCount = _itemIds.current();
        uint256 unsoldItemCount = itemCount - _itemsSold.current();
        
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 1; i <= itemCount; i++) {
            if (!idToMarketItem[i].sold) {
                items[currentIndex] = idToMarketItem[i];
                currentIndex++;
            }
        }
        
        return items;
    }
    
    /**
     * @dev Get items listed by a user
     */
    function fetchMyListings(address user) external view returns (MarketItem[] memory) {
        uint256 itemCount = _itemIds.current();
        uint256 myListingCount = 0;
        
        for (uint256 i = 1; i <= itemCount; i++) {
            if (idToMarketItem[i].seller == user && !idToMarketItem[i].sold) {
                myListingCount++;
            }
        }
        
        MarketItem[] memory items = new MarketItem[](myListingCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 1; i <= itemCount; i++) {
            if (idToMarketItem[i].seller == user && !idToMarketItem[i].sold) {
                items[currentIndex] = idToMarketItem[i];
                currentIndex++;
            }
        }
        
        return items;
    }
    
    /**
     * @dev Get items by game
     */
    function fetchItemsByGame(string memory gameName) external view returns (MarketItem[] memory) {
        uint256 itemCount = _itemIds.current();
        uint256 gameItemCount = 0;
        
        for (uint256 i = 1; i <= itemCount; i++) {
            if (keccak256(bytes(idToMarketItem[i].gameName)) == keccak256(bytes(gameName)) && !idToMarketItem[i].sold) {
                gameItemCount++;
            }
        }
        
        MarketItem[] memory items = new MarketItem[](gameItemCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 1; i <= itemCount; i++) {
            if (keccak256(bytes(idToMarketItem[i].gameName)) == keccak256(bytes(gameName)) && !idToMarketItem[i].sold) {
                items[currentIndex] = idToMarketItem[i];
                currentIndex++;
            }
        }
        
        return items;
    }
    
    /**
     * @dev Update minimum listing price
     */
    function setMinListingPrice(uint256 newPrice) external onlyOwner {
        minListingPrice = newPrice;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
