import React, { useState } from 'react';
import {
  Gamepad2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Wallet,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import toast from 'react-hot-toast';

const supportedGames = [
  {
    id: 'gta_v',
    name: 'GTA V',
    description: 'Grand Theft Auto V Online',
    color: 'from-green-500 to-green-600',
    icon: '🎮',
    conversionRate: 100  // 1 LXG = $100 in-game
  },
  {
    id: 'minecraft',
    name: 'Minecraft',
    description: 'Minecraft Java/Bedrock',
    color: 'from-green-600 to-emerald-600',
    icon: '⛏️',
    conversionRate: 50
  },
  {
    id: 'fortnite',
    name: 'Fortnite',
    description: 'Epic Games Battle Royale',
    color: 'from-purple-500 to-pink-500',
    icon: '🎯',
    conversionRate: 200
  },
  {
    id: 'roblox',
    name: 'Roblox',
    description: 'Roblox Platform',
    color: 'from-red-500 to-orange-500',
    icon: '🧱',
    conversionRate: 80
  },
  {
    id: 'csgo',
    name: 'CS:GO/CS2',
    description: 'Counter-Strike 2',
    color: 'from-orange-500 to-yellow-500',
    icon: '🔫',
    conversionRate: 150
  },
  {
    id: 'valorant',
    name: 'Valorant',
    description: 'Riot Games Tactical Shooter',
    color: 'from-red-600 to-red-700',
    icon: '⚡',
    conversionRate: 180
  }
];

function GameWallet() {
  const { realBalance, gameBalances, depositToGame, withdrawFromGame } = useWalletStore();
  const [selectedGame, setSelectedGame] = useState(null);
  const [transferType, setTransferType] = useState('deposit'); // deposit or withdraw
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTransfer = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    
    try {
      if (transferType === 'deposit') {
        if (parseFloat(amount) > realBalance) {
          toast.error('Insufficient real wallet balance');
          return;
        }
        await depositToGame(selectedGame.id, parseFloat(amount));
        toast.success(`Successfully deposited ${amount} LXG to ${selectedGame.name}`);
      } else {
        const gameBalance = gameBalances[selectedGame.id] || 0;
        if (parseFloat(amount) > gameBalance) {
          toast.error(`Insufficient balance in ${selectedGame.name}`);
          return;
        }
        await withdrawFromGame(selectedGame.id, parseFloat(amount));
        toast.success(`Successfully withdrew ${amount} LXG from ${selectedGame.name}`);
      }
      
      setAmount('');
      setSelectedGame(null);
    } catch (error) {
      toast.error(error.message || 'Transfer failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getInGameValue = (lxgAmount, game) => {
    return (lxgAmount * game.conversionRate).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Game Wallet</h1>
        <p className="text-gray-400 mt-1">Transfer LXG between your real wallet and game economies</p>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#b8941f] flex items-center justify-center">
              <Wallet className="w-5 h-5 text-black" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Real Wallet</p>
              <p className="text-xl font-bold">{realBalance.toFixed(2)} LXG</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total in Games</p>
              <p className="text-xl font-bold">
                {Object.values(gameBalances).reduce((a, b) => a + b, 0).toFixed(2)} LXG
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Connected Games</p>
              <p className="text-xl font-bold">{Object.keys(gameBalances).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Games Grid */}
      {!selectedGame ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {supportedGames.map((game) => {
            const balance = gameBalances[game.id] || 0;
            
            return (
              <div
                key={game.id}
                onClick={() => setSelectedGame(game)}
                className="card cursor-pointer hover:border-[#d4af37]/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center text-3xl`}>
                    {game.icon}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Balance</p>
                    <p className="text-lg font-bold">{balance.toFixed(2)} LXG</p>
                  </div>
                </div>
                
                <h3 className="font-semibold text-lg">{game.name}</h3>
                <p className="text-sm text-gray-500">{game.description}</p>
                
                <div className="mt-4 pt-4 border-t border-[#d4af37]/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">In-Game Value</span>
                    <span className="text-sm font-medium text-green-500">
                      ${getInGameValue(balance, game)}
                    </span>
                  </div>
                </div>
                
                <button className="mt-4 w-full py-2 rounded-lg bg-[#0a0a0f] border border-[#d4af37]/20 text-[#d4af37] text-sm font-medium group-hover:bg-[#d4af37]/10 transition-colors">
                  Transfer LXG
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Transfer Modal */
        <div className="card max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => {
                setSelectedGame(null);
                setAmount('');
              }}
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </button>
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedGame.color} flex items-center justify-center text-xl`}>
              {selectedGame.icon}
            </div>
            <div>
              <h3 className="font-semibold">{selectedGame.name}</h3>
              <p className="text-sm text-gray-500">{selectedGame.description}</p>
            </div>
          </div>

          {/* Transfer Type Toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-[#0a0a0f] rounded-xl">
            <button
              onClick={() => setTransferType('deposit')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                transferType === 'deposit'
                  ? 'bg-[#d4af37] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ArrowRight className="w-4 h-4 inline mr-2" />
              Deposit to Game
            </button>
            <button
              onClick={() => setTransferType('withdraw')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                transferType === 'withdraw'
                  ? 'bg-[#d4af37] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ArrowLeft className="w-4 h-4 inline mr-2" />
              Withdraw to Wallet
            </button>
          </div>

          {/* Current Balance */}
          <div className="p-4 bg-[#0a0a0f] rounded-xl mb-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">
                {transferType === 'deposit' ? 'Available in Real Wallet' : `Available in ${selectedGame.name}`}
              </span>
              <span className="font-bold">
                {transferType === 'deposit' 
                  ? `${realBalance.toFixed(2)} LXG`
                  : `${(gameBalances[selectedGame.id] || 0).toFixed(2)} LXG`
                }
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Amount (LXG)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="input text-2xl font-bold py-4"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  LXG
                </span>
              </div>
            </div>

            {amount && (
              <div className="p-4 bg-[#0a0a0f] rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">
                    {transferType === 'deposit' ? 'In-Game Value' : 'Real Wallet Value'}
                  </span>
                  <span className="text-lg font-bold text-green-500">
                    {transferType === 'deposit'
                      ? `$${getInGameValue(parseFloat(amount) || 0, selectedGame)}`
                      : `${amount} LXG`
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-500 text-sm">Conversion Rate</span>
                  <span className="text-sm text-gray-400">
                    1 LXG = ${selectedGame.conversionRate} in-game
                  </span>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-400">
                All transfers are validated by AI (Gemini + Claude) for security. 
                Large transfers may be held in escrow for 24 hours.
              </p>
            </div>

            <button
              onClick={handleTransfer}
              disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
              className="btn-primary w-full"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {transferType === 'deposit' ? (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Deposit to {selectedGame.name}
                    </>
                  ) : (
                    <>
                      <ArrowLeft className="w-4 h-4" />
                      Withdraw from {selectedGame.name}
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameWallet;
