import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, Bell, Menu, X, ChevronDown } from 'lucide-react';
import { useWalletStore } from '../store/walletStore';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { address, realBalance, disconnectWallet } = useWalletStore();
  const location = useLocation();

  const shortenAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/wallet', label: 'Wallet' },
    { path: '/game-wallet', label: 'Game Wallet' },
    { path: '/deposit', label: 'Deposit' },
    { path: '/withdraw', label: 'Withdraw' },
    { path: '/nft', label: 'NFTs' },
    { path: '/history', label: 'History' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4af37] to-[#b8941f] flex items-center justify-center">
              <span className="text-xs font-bold text-black">LXG</span>
            </div>
            <span className="text-lg font-bold gradient-text hidden sm:block">Laxigam</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? 'text-[#d4af37] bg-[#d4af37]/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Balance */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#1a1a2e] rounded-lg border border-[#d4af37]/20">
              <Wallet className="w-4 h-4 text-[#d4af37]" />
              <span className="text-sm font-medium">{realBalance.toFixed(2)} LXG</span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a2e] rounded-lg border border-[#d4af37]/20 hover:border-[#d4af37]/40 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#d4af37] to-[#b8941f] flex items-center justify-center">
                  <span className="text-xs font-bold text-black">
                    {address ? address.slice(2, 4).toUpperCase() : '?'}
                  </span>
                </div>
                <span className="text-sm hidden sm:block">{shortenAddress(address)}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1a1a2e] rounded-xl border border-[#d4af37]/20 shadow-xl z-50">
                  <div className="py-2">
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        disconnectWallet();
                        setIsProfileOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-white"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-[#0a0a0f] border-t border-[#d4af37]/10">
          <div className="px-4 py-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium ${
                  location.pathname === item.path
                    ? 'text-[#d4af37] bg-[#d4af37]/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
