import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_API_KEY || 'dev_secret';

export const useWalletStore = create(
  persist(
    (set, get) => ({
      // State
      address: null,
      isConnected: false,
      realBalance: 0,
      gameBalances: {},
      trustScore: 50,
      transactions: [],
      isLoading: false,
      telegramChatId: null,
      
      // Actions
      connectWallet: (address) => {
        set({ address, isConnected: true });
        get().fetchBalance();
        get().fetchTransactions();
      },
      
      disconnectWallet: () => {
        set({
          address: null,
          isConnected: false,
          realBalance: 0,
          gameBalances: {},
          transactions: []
        });
      },
      
      setTelegramChatId: (chatId) => {
        set({ telegramChatId: chatId });
      },
      
      fetchBalance: async () => {
        const { address } = get();
        if (!address) return;
        
        try {
          const response = await fetch(`${API_BASE}/api/balance/${address}`, {
            headers: { 'X-API-Key': API_KEY }
          });
          
          if (response.ok) {
            const data = await response.json();
            set({
              realBalance: data.real_wallet,
              gameBalances: data.game_wallets
            });
          }
        } catch (error) {
          console.error('Error fetching balance:', error);
        }
      },
      
      fetchTransactions: async () => {
        const { address } = get();
        if (!address) return;
        
        try {
          const response = await fetch(`${API_BASE}/api/transactions/${address}`, {
            headers: { 'X-API-Key': API_KEY }
          });
          
          if (response.ok) {
            const data = await response.json();
            set({ transactions: data.transactions });
          }
        } catch (error) {
          console.error('Error fetching transactions:', error);
        }
      },
      
      depositToGame: async (gameName, amount) => {
        const { address } = get();
        if (!address) throw new Error('Wallet not connected');
        
        try {
          const response = await fetch(`${API_BASE}/api/transfer/to-game`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': API_KEY
            },
            body: JSON.stringify({
              user_address: address,
              game_name: gameName,
              amount: parseFloat(amount)
            })
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Transfer failed');
          }
          
          const data = await response.json();
          get().fetchBalance();
          get().fetchTransactions();
          return data;
        } catch (error) {
          console.error('Error depositing to game:', error);
          throw error;
        }
      },
      
      withdrawFromGame: async (gameName, amount) => {
        const { address } = get();
        if (!address) throw new Error('Wallet not connected');
        
        try {
          const response = await fetch(`${API_BASE}/api/transfer/to-wallet`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': API_KEY
            },
            body: JSON.stringify({
              user_address: address,
              game_name: gameName,
              amount: parseFloat(amount),
              direction: 'to_wallet'
            })
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Transfer failed');
          }
          
          const data = await response.json();
          get().fetchBalance();
          get().fetchTransactions();
          return data;
        } catch (error) {
          console.error('Error withdrawing from game:', error);
          throw error;
        }
      },
      
      generatePIN: async () => {
        const { address, telegramChatId } = get();
        if (!address) throw new Error('Wallet not connected');
        
        try {
          const response = await fetch(`${API_BASE}/api/pin/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': API_KEY
            },
            body: JSON.stringify({
              user_address: address,
              telegram_chat_id: telegramChatId
            })
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'PIN generation failed');
          }
          
          return await response.json();
        } catch (error) {
          console.error('Error generating PIN:', error);
          throw error;
        }
      },
      
      verifyPIN: async (pin) => {
        const { address } = get();
        if (!address) throw new Error('Wallet not connected');
        
        try {
          const response = await fetch(`${API_BASE}/api/pin/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': API_KEY
            },
            body: JSON.stringify({
              user_address: address,
              pin
            })
          });
          
          return await response.json();
        } catch (error) {
          console.error('Error verifying PIN:', error);
          throw error;
        }
      }
    }),
    {
      name: 'laxigam-wallet-storage',
      partialize: (state) => ({
        address: state.address,
        isConnected: state.isConnected,
        telegramChatId: state.telegramChatId
      })
    }
  )
);

// Exchange rates store
export const useExchangeStore = create((set, get) => ({
  rates: {},
  lxgUsdRate: 0.05,
  lastUpdated: null,
  
  fetchRates: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/exchange-rates`, {
        headers: { 'X-API-Key': API_KEY }
      });
      
      if (response.ok) {
        const data = await response.json();
        set({
          rates: data.rates,
          lxgUsdRate: data.lxg_usd,
          lastUpdated: data.last_updated
        });
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    }
  },
  
  convertFiatToLXG: (amount, currency) => {
    const { rates, lxgUsdRate } = get();
    const rate = rates[currency]?.rate || 1;
    const usdAmount = amount / rate;
    return usdAmount / lxgUsdRate;
  },
  
  convertLXGToFiat: (amount, currency) => {
    const { rates, lxgUsdRate } = get();
    const rate = rates[currency]?.rate || 1;
    const usdAmount = amount * lxgUsdRate;
    return usdAmount * rate;
  }
}));
