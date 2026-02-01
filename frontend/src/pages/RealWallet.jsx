import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  RefreshCw,
  Copy,
  ExternalLink,
  Shield,
  TrendingUp
} from 'lucide-react';
import { useWalletStore, useExchangeStore } from '../store/walletStore';
import toast from 'react-hot-toast';

function RealWallet() {
  const { address, realBalance, trustScore, fetchBalance } = useWalletStore();
  const { lxgUsdRate, convertLXGToFiat, rates } = useExchangeStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [sendAmount, setSendAmount] = useState('');
  [sendRecipient, setSendRecipient] = useState('');

  const usdValue = realBalance * lxgUsdRate;

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard!');
  };

  const handleRefresh = async () => {
    await fetchBalance();
    toast.success('Balance updated!');
  };

  const getTrustScoreColor = () => {
    if (trustScore >= 70) return 'text-green-500';
    if (trustScore >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTrustScoreBg = () => {
    if (trustScore >= 70) return 'bg-green-500';
    if (trustScore >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Real Wallet</h1>
        <p className="text-gray-400 mt-1">Manage your LXG tokens in the real world</p>
      </div>

      {/* Balance Card */}
      <div className="card bg-gradient-to-br from-[#1a1a2e] to-[#252542]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-gray-400 text-sm">Available Balance</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold">{realBalance.toFixed(2)}</span>
              <span className="text-xl text-[#d4af37]">LXG</span>
            </div>
            <p className="text-gray-500 mt-1">≈ ${usdValue.toFixed(2)} USD</p>
          </div>
          
          <div className="flex gap-3">
            <Link to="/deposit" className="btn-primary">
              <ArrowDownLeft className="w-4 h-4" />
              Deposit
            </Link>
            <Link to="/withdraw" className="btn-secondary">
              <ArrowUpRight className="w-4 h-4" />
              Withdraw
            </Link>
            <button
              onClick={handleRefresh}
              className="p-3 rounded-xl bg-[#0a0a0f] border border-[#d4af37]/20 hover:border-[#d4af37]/40 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Address */}
        <div className="mt-6 pt-6 border-t border-[#d4af37]/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Wallet Address</p>
              <p className="font-mono text-sm mt-1">{address}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyAddress}
                className="p-2 rounded-lg bg-[#0a0a0f] hover:bg-white/5 transition-colors"
                title="Copy Address"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={`https://polygonscan.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-[#0a0a0f] hover:bg-white/5 transition-colors"
                title="View on Explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#d4af37]/10">
        {['overview', 'send', 'fiat-values'].map((tab) => (
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trust Score */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#d4af37]" />
              </div>
              <div>
                <h3 className="font-semibold">Trust Score</h3>
                <p className="text-sm text-gray-500">Your reputation on Laxigam</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="#1a1a2e"
                    strokeWidth="8"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${trustScore * 2.51} 251`}
                    className={getTrustScoreColor()}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${getTrustScoreColor()}`}>
                    {trustScore}
                  </span>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="trust-score-bar">
                  <div
                    className={`trust-score-fill ${getTrustScoreBg()}`}
                    style={{ width: `${trustScore}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  {trustScore >= 70
                    ? 'Excellent! You have unlimited transfers.'
                    : trustScore >= 30
                    ? 'Good! Complete more transactions to increase your limit.'
                    : 'Building trust. Complete transactions to increase your score.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card">
            <h3 className="font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Total Deposited</span>
                </div>
                <span className="font-medium">0 LXG</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Total Withdrawn</span>
                </div>
                <span className="font-medium">0 LXG</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-[#d4af37]" />
                  <span className="text-sm">Current Balance</span>
                </div>
                <span className="font-medium">{realBalance.toFixed(2)} LXG</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'send' && (
        <div className="card max-w-lg">
          <h3 className="font-semibold mb-4">Send LXG</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Recipient Address</label>
              <input
                type="text"
                value={sendRecipient}
                onChange={(e) => setSendRecipient(e.target.value)}
                placeholder="0x..."
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Amount (LXG)</label>
              <input
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.00"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available: {realBalance.toFixed(2)} LXG
              </p>
            </div>
            
            <button
              onClick={() => toast.info('P2P transfers coming soon!')}
              disabled={!sendRecipient || !sendAmount}
              className="btn-primary w-full"
            >
              <Send className="w-4 h-4" />
              Send LXG
            </button>
          </div>
        </div>
      )}

      {activeTab === 'fiat-values' && (
        <div className="card">
          <h3 className="font-semibold mb-4">Fiat Equivalent Values</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(rates).map(([currency, data]) => (
              <div
                key={currency}
                className="p-4 bg-[#0a0a0f] rounded-xl text-center"
              >
                <p className="text-2xl mb-1">
                  {currency === 'INR' && '🇮🇳'}
                  {currency === 'BRL' && '🇧🇷'}
                  {currency === 'RUB' && '🇷🇺'}
                  {currency === 'CNY' && '🇨🇳'}
                  {currency === 'USD' && '🇺🇸'}
                  {currency === 'ZAR' && '🇿🇦'}
                </p>
                <p className="font-semibold">{currency}</p>
                <p className="text-sm text-gray-500">
                  {(realBalance * lxgUsdRate * (data.rate || 1)).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RealWallet;
