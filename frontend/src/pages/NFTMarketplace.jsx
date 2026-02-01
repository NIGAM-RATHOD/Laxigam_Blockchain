import React, { useState } from 'react';
import {
  Image,
  Search,
  Filter,
  Heart,
  ShoppingCart,
  Tag,
  TrendingUp,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

// Mock NFT data
const mockNFTs = [
  {
    id: 1,
    name: 'Legendary Sword',
    game: 'GTA V',
    description: 'A legendary weapon from Los Santos',
    price: 500,
    image: '⚔️',
    rarity: 'legendary',
    seller: '0x1234...5678',
    likes: 42
  },
  {
    id: 2,
    name: 'Diamond Armor',
    game: 'Minecraft',
    description: 'Full set of diamond armor',
    price: 250,
    image: '💎',
    rarity: 'epic',
    seller: '0xabcd...efgh',
    likes: 28
  },
  {
    id: 3,
    name: 'Rare Skin',
    game: 'Fortnite',
    description: 'Exclusive battle pass skin',
    price: 150,
    image: '🎨',
    rarity: 'rare',
    seller: '0x9876...5432',
    likes: 15
  },
  {
    id: 4,
    name: 'Golden AK-47',
    game: 'CS:GO',
    description: 'Factory New golden skin',
    price: 1000,
    image: '🔫',
    rarity: 'legendary',
    seller: '0x1111...2222',
    likes: 89
  },
  {
    id: 5,
    name: 'Virtual Land',
    game: 'Roblox',
    description: 'Prime location virtual real estate',
    price: 2000,
    image: '🏞️',
    rarity: 'mythic',
    seller: '0x3333...4444',
    likes: 156
  },
  {
    id: 6,
    name: 'Agent Skin',
    game: 'Valorant',
    description: 'Limited edition agent skin',
    price: 300,
    image: '👤',
    rarity: 'epic',
    seller: '0x5555...6666',
    likes: 33
  }
];

const rarityColors = {
  common: 'from-gray-500 to-gray-600',
  rare: 'from-blue-500 to-blue-600',
  epic: 'from-purple-500 to-purple-600',
  legendary: 'from-orange-500 to-yellow-500',
  mythic: 'from-red-500 to-pink-500'
};

const rarityLabels = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic'
};

function NFTMarketplace() {
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('all');
  const [selectedGame, setSelectedGame] = useState('all');
  const [selectedNFT, setSelectedNFT] = useState(null);

  const filteredNFTs = mockNFTs.filter(nft => {
    const matchesSearch = nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         nft.game.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRarity = selectedRarity === 'all' || nft.rarity === selectedRarity;
    const matchesGame = selectedGame === 'all' || nft.game === selectedGame;
    return matchesSearch && matchesRarity && matchesGame;
  });

  const games = ['all', ...new Set(mockNFTs.map(nft => nft.game))];
  const rarities = ['all', ...new Set(mockNFTs.map(nft => nft.rarity))];

  const handleBuy = (nft) => {
    toast.info(`Purchase feature coming soon! ${nft.name} costs ${nft.price} LXG`);
  };

  const handleLike = (nftId) => {
    toast.success('Added to favorites!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">NFT Marketplace</h1>
          <p className="text-gray-400 mt-1">Buy and sell in-game items as NFTs</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => toast.info('List item feature coming soon!')}
            className="btn-primary"
          >
            <Tag className="w-4 h-4" />
            List Item
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-400">Total Volume</p>
          <p className="text-xl font-bold text-[#d4af37]">125,000 LXG</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Items Listed</p>
          <p className="text-xl font-bold">1,234</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Active Users</p>
          <p className="text-xl font-bold">567</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Floor Price</p>
          <p className="text-xl font-bold text-green-500">50 LXG</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#d4af37]/10">
        {['browse', 'my-items', 'favorites', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-[#d4af37] border-b-2 border-[#d4af37]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'browse' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items, games..."
                className="input pl-10"
              />
            </div>
            
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="input w-full sm:w-40"
            >
              <option value="all">All Games</option>
              {games.filter(g => g !== 'all').map(game => (
                <option key={game} value={game}>{game}</option>
              ))}
            </select>
            
            <select
              value={selectedRarity}
              onChange={(e) => setSelectedRarity(e.target.value)}
              className="input w-full sm:w-40"
            >
              <option value="all">All Rarities</option>
              {rarities.filter(r => r !== 'all').map(rarity => (
                <option key={rarity} value={rarity}>
                  {rarityLabels[rarity]}
                </option>
              ))}
            </select>
          </div>

          {/* NFT Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNFTs.map((nft) => (
              <div
                key={nft.id}
                className="card group cursor-pointer"
                onClick={() => setSelectedNFT(nft)}
              >
                {/* Image */}
                <div className={`relative aspect-square rounded-xl bg-gradient-to-br ${rarityColors[nft.rarity]} flex items-center justify-center mb-4`}>
                  <span className="text-6xl">{nft.image}</span>
                  <div className="absolute top-2 right-2">
                    <span className="badge bg-black/50 text-white text-xs">
                      {rarityLabels[nft.rarity]}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <span className="badge bg-black/50 text-white text-xs">
                      {nft.game}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <h3 className="font-semibold text-lg mb-1">{nft.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{nft.description}</p>

                {/* Price & Actions */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Price</p>
                    <p className="text-lg font-bold text-[#d4af37]">{nft.price} LXG</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(nft.id);
                      }}
                      className="p-2 rounded-lg bg-[#0a0a0f] hover:bg-white/5 transition-colors"
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuy(nft);
                      }}
                      className="btn-primary py-2 px-4"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Buy
                    </button>
                  </div>
                </div>

                {/* Seller */}
                <div className="mt-3 pt-3 border-t border-[#d4af37]/10 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Seller: {nft.seller}</span>
                  <span className="text-gray-500 flex items-center gap-1">
                    <Heart className="w-3 h-3" /> {nft.likes}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'my-items' && (
        <div className="text-center py-12">
          <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Items Listed</h3>
          <p className="text-gray-400 mb-4">You haven't listed any items yet</p>
          <button
            onClick={() => toast.info('List item feature coming soon!')}
            className="btn-primary"
          >
            List Your First Item
          </button>
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="text-center py-12">
          <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Favorites</h3>
          <p className="text-gray-400 mb-4">Items you like will appear here</p>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No History</h3>
          <p className="text-gray-400 mb-4">Your transaction history will appear here</p>
        </div>
      )}

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedNFT(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`aspect-video rounded-xl bg-gradient-to-br ${rarityColors[selectedNFT.rarity]} flex items-center justify-center mb-6`}>
              <span className="text-8xl">{selectedNFT.image}</span>
            </div>

            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedNFT.name}</h2>
                <p className="text-gray-400">{selectedNFT.game}</p>
              </div>
              <span className={`badge bg-gradient-to-r ${rarityColors[selectedNFT.rarity]} text-white`}>
                {rarityLabels[selectedNFT.rarity]}
              </span>
            </div>

            <p className="text-gray-300 mb-6">{selectedNFT.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-[#0a0a0f] rounded-xl">
                <p className="text-sm text-gray-500">Price</p>
                <p className="text-2xl font-bold text-[#d4af37]">{selectedNFT.price} LXG</p>
              </div>
              <div className="p-4 bg-[#0a0a0f] rounded-xl">
                <p className="text-sm text-gray-500">Seller</p>
                <p className="font-medium">{selectedNFT.seller}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleBuy(selectedNFT);
                  setSelectedNFT(null);
                }}
                className="btn-primary flex-1"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy Now
              </button>
              <button
                onClick={() => setSelectedNFT(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NFTMarketplace;
