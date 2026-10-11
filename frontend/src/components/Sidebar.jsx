import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ExternalLink,
  Gamepad2,
  Github,
  History,
  Image,
  LayoutDashboard,
  Send,
  Settings,
  Wallet,
} from 'lucide-react';
import { APP_VERSION, GITHUB_URL, TELEGRAM_URL } from '../config';
import Flag from './ui/Flag';

export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/wallet', label: 'Real Wallet', icon: Wallet },
      { path: '/game-wallet', label: 'Game Wallets', icon: Gamepad2 },
    ],
  },
  {
    title: 'Move money',
    items: [
      { path: '/mediator', label: 'Mediator', icon: ArrowLeftRight, badge: 'Fiat ⇄ LXG' },
      { path: '/deposit', label: 'Deposit', icon: ArrowDownLeft },
      { path: '/withdraw', label: 'Withdraw', icon: ArrowUpRight },
    ],
  },
  {
    title: 'More',
    items: [
      { path: '/nft', label: 'NFT Marketplace', icon: Image },
      { path: '/history', label: 'History', icon: History },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-16 bottom-0 w-64 z-40 border-r border-white/5 bg-black/30 backdrop-blur-xl">
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="eyebrow px-3 mb-2 !text-[10px]">{section.title}</p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'text-white bg-gradient-to-r from-[#d4af37]/15 via-[#d4af37]/5 to-transparent'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-[#f6e27a] to-[#a8811a] shadow-[0_0_12px_rgba(212,175,55,0.8)]" />}
                      <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-[#f6e27a]' : 'text-gray-500 group-hover:text-gray-300'}`} />
                      <span>{item.label}</span>
                      {item.badge && <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#d4af37]/15 text-[#f6e27a]">{item.badge}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="eyebrow px-3 mb-2 !text-[10px]">Connect</p>
          <ExternalItem href={TELEGRAM_URL} icon={Send} iconClass="text-sky-400">Telegram Bot</ExternalItem>
          <ExternalItem href={GITHUB_URL} icon={Github}>Source on GitHub</ExternalItem>
        </div>
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="surface-inset p-3">
          <p className="text-[10px] eyebrow mb-2">BRICS+ rails</p>
          <div className="flex justify-between text-lg">
            {[['🇮🇳', 'India · UPI'], ['🇧🇷', 'Brazil · PIX'], ['🇷🇺', 'Russia · QIWI'], ['🇨🇳', 'China · Alipay'], ['🇿🇦', 'South Africa'], ['⭐', 'Telegram Stars'], ['💎', 'TON']].map(([flag, title]) => (
              <span key={title} className="hover:scale-125 transition-transform cursor-default"><Flag emoji={flag} size={14} title={title} /></span>
            ))}
          </div>
        </div>
        <p className="mt-3 px-1 text-[11px] text-gray-600 font-mono">Laxigam v{APP_VERSION} · LXG ERC-20 · Polygon</p>
      </div>
    </aside>
  );
}

function ExternalItem({ href, icon: Icon, iconClass = 'text-gray-500', children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all"
    >
      <Icon className={`w-[18px] h-[18px] ${iconClass}`} />
      {children}
      <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
    </a>
  );
}

export default Sidebar;
