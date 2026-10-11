import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, ChevronDown, Copy, ExternalLink, LogOut, Settings, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from './ui/Logo';
import AnimatedNumber from './ui/AnimatedNumber';
import NetworkPill from './ui/NetworkPill';
import { useWalletStore } from '../store/walletStore';

const shortenAddress = (addr) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '');

/** Deterministic gradient avatar derived from the wallet address. */
export function AddressAvatar({ address, size = 28 }) {
  const seed = parseInt((address || '0x000000').slice(2, 8), 16) || 0;
  const hue = seed % 360;
  return (
    <span
      className="inline-block rounded-full ring-1 ring-white/20 shrink-0"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from ${seed % 180}deg, hsl(${hue} 80% 60%), hsl(${(hue + 70) % 360} 80% 50%), hsl(${(hue + 160) % 360} 70% 45%), hsl(${hue} 80% 60%))`,
      }}
    />
  );
}

function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { address, realBalance, disconnectWallet } = useWalletStore();
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isProfileOpen) return;
    const close = (event) => !menuRef.current?.contains(event.target) && setIsProfileOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isProfileOpen]);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Address copied');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="px-4 lg:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <Logo size={32} />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <NetworkPill />
          </div>

          <Link
            to="/wallet"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-b from-[#d4af37]/15 to-[#d4af37]/5 border border-[#d4af37]/25 hover:border-[#d4af37]/50 transition-colors"
          >
            <Wallet className="w-4 h-4 text-[#f6e27a]" />
            <span className="text-sm font-semibold">
              <AnimatedNumber value={realBalance} /> <span className="text-[#d4af37]">LXG</span>
            </span>
          </Link>

          <button className="relative p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors" aria-label="Notifications">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#d4af37] rounded-full ring-2 ring-[#07070b]" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-[#d4af37]/40 transition-colors"
              aria-expanded={isProfileOpen}
            >
              <AddressAvatar address={address} />
              <span className="text-sm font-mono hidden sm:block">{shortenAddress(address)}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 card !p-2 animate-rise">
                <div className="flex items-center gap-3 p-3">
                  <AddressAvatar address={address} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm font-mono truncate">{shortenAddress(address)}</p>
                    <p className="text-xs text-gray-500">Connected · MetaMask</p>
                  </div>
                </div>
                <div className="h-px bg-white/5 my-1" />
                <MenuButton onClick={copyAddress} icon={copied ? Check : Copy}>Copy address</MenuButton>
                <MenuLink href={`https://polygonscan.com/address/${address}`} icon={ExternalLink}>View on Polygonscan</MenuLink>
                <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white">
                  <Settings className="w-4 h-4" /> Settings
                </Link>
                <div className="h-px bg-white/5 my-1" />
                <MenuButton
                  onClick={() => {
                    disconnectWallet();
                    setIsProfileOpen(false);
                  }}
                  icon={LogOut}
                  danger
                >
                  Disconnect
                </MenuButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function MenuButton({ onClick, icon: Icon, children, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-white/5 ${danger ? 'text-red-400' : 'text-gray-300 hover:text-white'}`}
    >
      <Icon className="w-4 h-4" /> {children}
    </button>
  );
}

function MenuLink({ href, icon: Icon, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white">
      <Icon className="w-4 h-4" /> {children}
    </a>
  );
}

export default Navbar;
