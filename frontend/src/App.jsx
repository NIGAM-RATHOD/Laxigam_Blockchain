import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Scene from './components/ui/Scene';
import Landing from './pages/Landing';
// Logged-in pages are split into their own chunks so the landing page loads fast
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RealWallet = lazy(() => import('./pages/RealWallet'));
const GameWallet = lazy(() => import('./pages/GameWallet'));
const Deposit = lazy(() => import('./pages/Deposit'));
const Withdraw = lazy(() => import('./pages/Withdraw'));
const Mediator = lazy(() => import('./pages/Mediator'));
const NFTMarketplace = lazy(() => import('./pages/NFTMarketplace'));
const TransactionHistory = lazy(() => import('./pages/TransactionHistory'));
const Settings = lazy(() => import('./pages/Settings'));
import { useWalletStore } from './store/walletStore';
import { useTelegram } from './hooks/useTelegram';
import { TELEGRAM_URL } from './config';
import './App.css';

function App() {
  const { connectWallet, disconnectWallet, isConnected } = useWalletStore();
  const { inTelegram } = useTelegram();
  const location = useLocation();

  // Re-sync with MetaMask: restore a silent session, follow account switches
  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts) => accounts[0] && connectWallet(accounts[0]))
      .catch(() => {});

    const onAccountsChanged = (accounts) => (accounts[0] ? connectWallet(accounts[0]) : disconnectWallet());
    window.ethereum.on?.('accountsChanged', onAccountsChanged);
    return () => window.ethereum.removeListener?.('accountsChanged', onAccountsChanged);
  }, [connectWallet, disconnectWallet]);

  // Each route starts at the top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <TonConnectUIProvider
      manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}
      actionsConfiguration={{ twaReturnUrl: TELEGRAM_URL }}
    >
      <div className={`relative min-h-screen ${inTelegram ? 'telegram-webapp' : ''}`}>
        <Scene />
        {isConnected ? (
          <div className="relative z-10">
            <Navbar />
            <Sidebar />
            <div className="lg:ml-64">
              <main key={location.pathname} className="max-w-7xl mx-auto px-4 lg:px-8 pt-24 pb-28 lg:pb-12 animate-rise">
                <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/wallet" element={<RealWallet />} />
                  <Route path="/game-wallet" element={<GameWallet />} />
                  <Route path="/deposit" element={<Deposit />} />
                  <Route path="/withdraw" element={<Withdraw />} />
                  <Route path="/mediator" element={<Mediator />} />
                  <Route path="/nft" element={<NFTMarketplace />} />
                  <Route path="/history" element={<TransactionHistory />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
              </main>
            </div>
            <MobileNav />
          </div>
        ) : (
          <Landing onConnect={connectWallet} isTelegram={inTelegram} />
        )}
      </div>
    </TonConnectUIProvider>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="spinner" />
    </div>
  );
}

export default App;
