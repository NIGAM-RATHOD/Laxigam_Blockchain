import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import toast from 'react-hot-toast';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import RealWallet from './pages/RealWallet';
import GameWallet from './pages/GameWallet';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import NFTMarketplace from './pages/NFTMarketplace';
import TransactionHistory from './pages/TransactionHistory';
import Settings from './pages/Settings';
import { useWalletStore } from './store/walletStore';
import './App.css';

// Telegram WebApp detection
const isTelegramWebApp = () => {
  return window.Telegram?.WebApp !== undefined;
};

function App() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { connectWallet, isConnected, address } = useWalletStore();

  useEffect(() => {
    // Detect Telegram WebApp
    const telegram = isTelegramWebApp();
    setIsTelegram(telegram);

    if (telegram) {
      // Initialize Telegram WebApp
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      
      // Set header color
      window.Telegram.WebApp.setHeaderColor('#0a0a0f');
      window.Telegram.WebApp.setBackgroundColor('#0a0a0f');
      
      // Get user data if available
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user) {
        console.log('Telegram User:', user);
      }
    }

    // Check for existing wallet connection
    checkExistingConnection();
    setIsLoading(false);
  }, []);

  const checkExistingConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          connectWallet(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <TonConnectUIProvider 
      manifestUrl="https://laxigam.com/tonconnect-manifest.json"
      actionsConfiguration={{
        twaReturnUrl: 'https://t.me/Laxigam_blockchain_bot'
      }}
    >
      <div className={`min-h-screen bg-[#0a0a0f] ${isTelegram ? 'telegram-webapp' : ''}`}>
        {isConnected ? (
          <div className="flex">
            <Sidebar />
            <div className="flex-1 ml-0 lg:ml-64">
              <Navbar />
              <main className="p-4 lg:p-8 pt-20 lg:pt-24">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/wallet" element={<RealWallet />} />
                  <Route path="/game-wallet" element={<GameWallet />} />
                  <Route path="/deposit" element={<Deposit />} />
                  <Route path="/withdraw" element={<Withdraw />} />
                  <Route path="/nft" element={<NFTMarketplace />} />
                  <Route path="/history" element={<TransactionHistory />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        ) : (
          <WelcomeScreen onConnect={connectWallet} isTelegram={isTelegram} />
        )}
      </div>
    </TonConnectUIProvider>
  );
}

// Welcome Screen Component
function WelcomeScreen({ onConnect, isTelegram }) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleMetaMaskConnect = async () => {
    setIsConnecting(true);
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        onConnect(accounts[0]);
        toast.success('Wallet connected successfully!');
      } else {
        toast.error('MetaMask not found. Please install MetaMask.');
        window.open('https://metamask.io/download/', '_blank');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleWalletConnect = async () => {
    toast.info('WalletConnect integration coming soon!');
  };

  const handleTONConnect = async () => {
    toast.info('TON Connect integration coming soon!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#d4af37] to-[#b8941f] flex items-center justify-center animate-pulse-gold">
            <span className="text-4xl font-bold text-black">LXG</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Laxigam</h1>
          <p className="text-gray-400">Blockchain Gaming Finance</p>
        </div>

        {/* Welcome Card */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to Laxigam</h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to bridge real-world finance with game economies. 
            Buy LXG tokens, transfer to games, and withdraw your earnings.
          </p>

          {/* Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[#d4af37]">✓</span>
              <span>BRICS+ Payment Support</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[#d4af37]">✓</span>
              <span>AI-Powered Security</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[#d4af37]">✓</span>
              <span>Telegram & TON Integration</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[#d4af37]">✓</span>
              <span>Cross-Game Transfers</span>
            </div>
          </div>

          {/* Connect Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleMetaMaskConnect}
              disabled={isConnecting}
              className="btn-primary w-full"
            >
              {isConnecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <img src="/metamask.svg" alt="MetaMask" className="w-5 h-5" />
                  Connect MetaMask
                </>
              )}
            </button>

            <button
              onClick={handleWalletConnect}
              className="btn-secondary w-full"
            >
              <img src="/walletconnect.svg" alt="WalletConnect" className="w-5 h-5" />
              WalletConnect
            </button>

            <button
              onClick={handleTONConnect}
              className="btn-secondary w-full"
            >
              <span className="text-[#0088cc] font-bold">TON</span>
              Connect TON Wallet
            </button>
          </div>
        </div>

        {/* Supported Payments */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">Supported Payment Methods</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <span className="text-2xl" title="UPI (India)">🇮🇳</span>
            <span className="text-2xl" title="PIX (Brazil)">🇧🇷</span>
            <span className="text-2xl" title="QIWI (Russia)">🇷🇺</span>
            <span className="text-2xl" title="Alipay (China)">🇨🇳</span>
            <span className="text-2xl" title="Telegram Stars">⭐</span>
            <span className="text-2xl" title="TON Network">💎</span>
          </div>
        </div>

        {/* Telegram info */}
        {isTelegram && (
          <div className="mt-6 text-center">
            <span className="badge badge-gold">Telegram Mini App</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
