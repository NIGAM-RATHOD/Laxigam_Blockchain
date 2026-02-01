import React, { useState } from 'react';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Gamepad2,
  RefreshCw,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import toast from 'react-hot-toast';

// Mock transaction data
const mockTransactions = [
  {
    id: 'tx1',
    type: 'deposit',
    amount: 1000,
    currency: 'LXG',
    status: 'completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    source: 'UPI',
    destination: 'Real Wallet',
    txHash: '0xabc...def'
  },
  {
    id: 'tx2',
    type: 'transfer_to_game',
    amount: 500,
    currency: 'LXG',
    status: 'completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    source: 'Real Wallet',
    destination: 'GTA V',
    txHash: '0x123...456'
  },
  {
    id: 'tx3',
    type: 'withdraw',
    amount: 200,
    currency: 'LXG',
    status: 'pending',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    source: 'Real Wallet',
    destination: 'Bank Account',
    txHash: '0x789...012'
  },
  {
    id: 'tx4',
    type: 'transfer_to_wallet',
    amount: 300,
    currency: 'LXG',
    status: 'completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    source: 'Minecraft',
    destination: 'Real Wallet',
    txHash: '0x345...678'
  },
  {
    id: 'tx5',
    type: 'deposit',
    amount: 500,
    currency: 'LXG',
    status: 'completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    source: 'PIX',
    destination: 'Real Wallet',
    txHash: '0x901...234'
  }
];

const statusColors = {
  completed: 'bg-green-500/20 text-green-500',
  pending: 'bg-yellow-500/20 text-yellow-500',
  failed: 'bg-red-500/20 text-red-500',
  processing: 'bg-blue-500/20 text-blue-500'
};

const typeIcons = {
  deposit: ArrowDownLeft,
  withdraw: ArrowUpRight,
  transfer_to_game: Gamepad2,
  transfer_to_wallet: RefreshCw
};

const typeColors = {
  deposit: 'text-green-500',
  withdraw: 'text-red-500',
  transfer_to_game: 'text-blue-500',
  transfer_to_wallet: 'text-purple-500'
};

function TransactionHistory() {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredTransactions = mockTransactions.filter(tx => {
    const matchesFilter = filter === 'all' || tx.type === filter;
    const matchesSearch = tx.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tx.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tx.txHash.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 1000 * 60) return 'Just now';
    if (diff < 1000 * 60 * 60) return `${Math.floor(diff / (1000 * 60))}m ago`;
    if (diff < 1000 * 60 * 60 * 24) return `${Math.floor(diff / (1000 * 60 * 60))}h ago`;
    if (diff < 1000 * 60 * 60 * 24 * 7) return `${Math.floor(diff / (1000 * 60 * 60 * 24))}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleExport = () => {
    toast.info('Export feature coming soon!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transaction History</h1>
          <p className="text-gray-400 mt-1">View all your LXG transactions</p>
        </div>
        <button
          onClick={handleExport}
          className="btn-secondary"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions..."
            className="input"
          />
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input w-full sm:w-48"
        >
          <option value="all">All Types</option>
          <option value="deposit">Deposits</option>
          <option value="withdraw">Withdrawals</option>
          <option value="transfer_to_game">To Game</option>
          <option value="transfer_to_wallet">From Game</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-400">Total Deposits</p>
          <p className="text-xl font-bold text-green-500">
            +{mockTransactions
              .filter(tx => tx.type === 'deposit')
              .reduce((sum, tx) => sum + tx.amount, 0)} LXG
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Total Withdrawals</p>
          <p className="text-xl font-bold text-red-500">
            -{mockTransactions
              .filter(tx => tx.type === 'withdraw')
              .reduce((sum, tx) => sum + tx.amount, 0)} LXG
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">To Games</p>
          <p className="text-xl font-bold text-blue-500">
            {mockTransactions
              .filter(tx => tx.type === 'transfer_to_game')
              .reduce((sum, tx) => sum + tx.amount, 0)} LXG
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">From Games</p>
          <p className="text-xl font-bold text-purple-500">
            {mockTransactions
              .filter(tx => tx.type === 'transfer_to_wallet')
              .reduce((sum, tx) => sum + tx.amount, 0)} LXG
          </p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card">
        {paginatedTransactions.length > 0 ? (
          <div className="space-y-2">
            {paginatedTransactions.map((tx) => {
              const Icon = typeIcons[tx.type];
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 p-4 bg-[#0a0a0f] rounded-xl hover:bg-[#1a1a2e] transition-colors"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusColors[tx.status]}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {tx.type.replace(/_/g, ' ')}
                      </span>
                      <span className={`badge ${statusColors[tx.status]} text-xs`}>
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {tx.source} → {tx.destination}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className={`font-bold ${typeColors[tx.type]}`}>
                      {tx.type === 'deposit' || tx.type === 'transfer_to_wallet' ? '+' : '-'}
                      {tx.amount} {tx.currency}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(tx.timestamp)}
                    </p>
                  </div>

                  {/* Actions */}
                  <a
                    href={`https://polygonscan.com/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-500 hover:text-[#d4af37] transition-colors"
                  >
                    <History className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Transactions</h3>
            <p className="text-gray-400">Your transaction history will appear here</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-[#0a0a0f] disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <span className="px-4 py-2">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-[#0a0a0f] disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionHistory;
