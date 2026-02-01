import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  Gamepad2,
  TrendingUp,
  Shield,
  ArrowRight,
  Zap,
  Globe,
  Cpu
} from 'lucide-react';
import { useWalletStore, useExchangeStore } from '../store/walletStore';

function Dashboard() {
  const { address, realBalance, gameBalances, trustScore, transactions } = useWalletStore();
  const { lxgUsdRate, fetchRates } = useExchangeStore();

  useEffect(() => {
    fetchRates();
  }, []);

  const totalGameBalance = Object.values(gameBalances).reduce((a, b) => a + b, 0);
  const totalBalance = realBalance + totalGameBalance;
  const usdValue = totalBalance * lxgUsdRate;

  const stats = [
    {
      title: 'Total Balance',
      value: `${totalBalance.toFixed(2)} LXG`,
      subValue: `~$${usdValue.toFixed(2)} USD`,
      icon: Wallet,
      color: 'from-[#d4af37] to-[#b8941f]'
    },
    {
      title: 'Real Wallet',
      value: `${realBalance.toFixed(2)} LXG`,
      subValue: 'Available for withdrawal',
      icon: Wallet,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Game Wallets',
      value: `${totalGameBalance.toFixed(2)} LXG`,
      subValue: `${Object.keys(gameBalances).length} games connected`,
      icon: Gamepad2,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Trust Score',
      value: `${trustScore}/100`,
      subValue: trustScore >= 70 ? 'Excellent' : trustScore >= 30 ? 'Good' : 'Building',
      icon: Shield,
      color: trustScore >= 70 ? 'from-green-500 to-green-600' : trustScore >= 30 ? 'from-yellow-500 to-yellow-600' : 'from-red-500 to-red-600'
    }
  ];

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Welcome back! Here's your Laxigam overview.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/deposit"
            className="btn-primary"
          >
            <TrendingUp className="w-4 h-4" />
            Deposit
          </Link>
          <Link
            to="/withdraw"
            className="btn-secondary"
          >
            <Zap className="w-4 h-4" />
            Withdraw
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.subValue}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Wallets */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Game Wallets</h2>
            <Link to="/game-wallet" className="text-[#d4af37] text-sm flex items-center gap-1 hover:underline">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {Object.keys(gameBalances).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(gameBalances).map(([game, balance]) => (
                <div
                  key={game}
                  className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl border border-[#d4af37]/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Gamepad2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{game}</p>
                      <p className="text-sm text-gray-500">Gaming Balance</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{balance.toFixed(2)} LXG</p>
                    <p className="text-sm text-gray-500">~${(balance * lxgUsdRate).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No game wallets connected</p>
              <Link to="/game-wallet" className="text-[#d4af37] text-sm mt-2 inline-block">
                Connect your first game
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions & Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to="/deposit"
                className="flex items-center gap-3 p-3 rounded-xl bg-[#0a0a0f] border border-[#d4af37]/10 hover:border-[#d4af37]/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Deposit Funds</p>
                  <p className="text-xs text-gray-500">Add LXG to your wallet</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500" />
              </Link>
              
              <Link
                to="/withdraw"
                className="flex items-center gap-3 p-3 rounded-xl bg-[#0a0a0f] border border-[#d4af37]/10 hover:border-[#d4af37]/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Withdraw</p>
                  <p className="text-xs text-gray-500">Cash out to bank</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500" />
              </Link>
              
              <Link
                to="/game-wallet"
                className="flex items-center gap-3 p-3 rounded-xl bg-[#0a0a0f] border border-[#d4af37]/10 hover:border-[#d4af37]/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Transfer to Game</p>
                  <p className="text-xs text-gray-500">Move LXG to games</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500" />
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Features</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-[#d4af37]" />
                </div>
                <div>
                  <p className="font-medium text-sm">BRICS+ Payments</p>
                  <p className="text-xs text-gray-500">UPI, PIX, QIWI, Alipay</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-[#d4af37]" />
                </div>
                <div>
                  <p className="font-medium text-sm">AI Validation</p>
                  <p className="text-xs text-gray-500">Gemini + Claude consensus</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#d4af37]" />
                </div>
                <div>
                  <p className="font-medium text-sm">Trust Score</p>
                  <p className="text-xs text-gray-500">Build reputation, unlock limits</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <Link to="/history" className="text-[#d4af37] text-sm flex items-center gap-1 hover:underline">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {recentTransactions.length > 0 ? (
          <div className="space-y-2">
            {recentTransactions.map((tx, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tx.type === 'deposit' ? 'bg-green-500/20' :
                    tx.type === 'withdraw' ? 'bg-red-500/20' :
                    'bg-blue-500/20'
                  }`}>
                    {tx.type === 'deposit' ? <TrendingUp className="w-5 h-5 text-green-500" /> :
                     tx.type === 'withdraw' ? <Zap className="w-5 h-5 text-red-500" /> :
                     <Gamepad2 className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div>
                    <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-500">
                      {tx.source} → {tx.destination}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    tx.type === 'deposit' ? 'text-green-500' :
                    tx.type === 'withdraw' ? 'text-red-500' :
                    'text-blue-500'
                  }`}>
                    {tx.type === 'deposit' ? '+' : '-'}{tx.amount_lxg?.toFixed(2)} LXG
                  </p>
                  <p className="text-xs text-gray-500">
                    {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'Just now'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No transactions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
