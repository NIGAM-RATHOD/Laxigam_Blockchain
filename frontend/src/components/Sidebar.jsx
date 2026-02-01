import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  Gamepad2,
  ArrowDownLeft,
  ArrowUpRight,
  Image,
  History,
  Settings,
  ExternalLink
} from 'lucide-react';

function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/wallet', label: 'Real Wallet', icon: Wallet },
    { path: '/game-wallet', label: 'Game Wallet', icon: Gamepad2 },
    { path: '/deposit', label: 'Deposit', icon: ArrowDownLeft },
    { path: '/withdraw', label: 'Withdraw', icon: ArrowUpRight },
    { path: '/nft', label: 'NFT Marketplace', icon: Image },
    { path: '/history', label: 'History', icon: History },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:block fixed left-0 top-16 bottom-0 w-64 bg-[#0a0a0f] border-r border-[#d4af37]/10 overflow-y-auto">
      <div className="p-4">
        {/* Navigation */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#d4af37]/20 to-transparent text-[#d4af37] border-l-2 border-[#d4af37]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#d4af37]' : ''}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="my-6 border-t border-[#d4af37]/10"></div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4">
            Quick Actions
          </h3>
          
          <a
            href="https://t.me/Laxigam_blockchain_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <span className="text-xl">✈️</span>
            <span className="font-medium">Telegram Bot</span>
            <ExternalLink className="w-4 h-4 ml-auto" />
          </a>
          
          <a
            href="https://blum.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <span className="text-xl">🪙</span>
            <span className="font-medium">Alex Coin (BLUM)</span>
            <ExternalLink className="w-4 h-4 ml-auto" />
          </a>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-[#d4af37]/10"></div>

        {/* Supported Countries */}
        <div className="px-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            BRICS+ Payments
          </h3>
          <div className="flex flex-wrap gap-2">
            <span className="text-lg" title="India - UPI">🇮🇳</span>
            <span className="text-lg" title="Brazil - PIX">🇧🇷</span>
            <span className="text-lg" title="Russia - QIWI">🇷🇺</span>
            <span className="text-lg" title="China - Alipay">🇨🇳</span>
            <span className="text-lg" title="South Africa">🇿🇦</span>
            <span className="text-lg" title="Telegram Stars">⭐</span>
            <span className="text-lg" title="TON Network">💎</span>
          </div>
        </div>

        {/* Version */}
        <div className="mt-8 px-4">
          <p className="text-xs text-gray-600">
            Laxigam v2.0.0
          </p>
          <p className="text-xs text-gray-600 mt-1">
            LXG Token • ERC-20
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
