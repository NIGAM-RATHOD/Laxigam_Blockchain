import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Wallet,
  Globe,
  Link,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import toast from 'react-hot-toast';

function Settings() {
  const { address, telegramChatId, setTelegramChatId, disconnectWallet } = useWalletStore();
  const [activeSection, setActiveSection] = useState('general');
  const [copied, setCopied] = useState(false);
  const [telegramId, setTelegramId] = useState(telegramChatId || '');

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const saveTelegramId = () => {
    setTelegramChatId(telegramId);
    toast.success('Telegram ID saved!');
  };

  const sections = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'connections', label: 'Connections', icon: Link },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeSection === section.id
                      ? 'bg-[#d4af37]/10 text-[#d4af37]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{section.label}</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeSection === 'general' && (
            <div className="space-y-4">
              <div className="card">
                <h3 className="font-semibold mb-4">General Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div>
                      <p className="font-medium">Language</p>
                      <p className="text-sm text-gray-500">Select your preferred language</p>
                    </div>
                    <select className="input w-32">
                      <option value="en">English</option>
                      <option value="hi">हिंदी</option>
                      <option value="pt">Português</option>
                      <option value="ru">Русский</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div>
                      <p className="font-medium">Currency Display</p>
                      <p className="text-sm text-gray-500">Show fiat values in</p>
                    </div>
                    <select className="input w-32">
                      <option value="usd">USD</option>
                      <option value="inr">INR</option>
                      <option value="brl">BRL</option>
                      <option value="rub">RUB</option>
                      <option value="cny">CNY</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div>
                      <p className="font-medium">Theme</p>
                      <p className="text-sm text-gray-500">Dark mode is always on</p>
                    </div>
                    <span className="text-gray-500">Dark</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'profile' && (
            <div className="space-y-4">
              <div className="card">
                <h3 className="font-semibold mb-4">Profile Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Wallet Address</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={address}
                        readOnly
                        className="input font-mono text-sm"
                      />
                      <button
                        onClick={copyAddress}
                        className="p-3 rounded-xl bg-[#0a0a0f] hover:bg-white/5 transition-colors"
                      >
                        {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Telegram Chat ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={telegramId}
                        onChange={(e) => setTelegramId(e.target.value)}
                        placeholder="e.g., 123456789"
                        className="input"
                      />
                      <button
                        onClick={saveTelegramId}
                        className="btn-primary"
                      >
                        Save
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Get your Chat ID from @userinfobot on Telegram
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-4">
              <div className="card">
                <h3 className="font-semibold mb-4">Security Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div>
                      <p className="font-medium">PIN Protection</p>
                      <p className="text-sm text-gray-500">Require PIN for transactions</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d4af37]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div>
                      <p className="font-medium">AI Validation</p>
                      <p className="text-sm text-gray-500">Enable dual AI consensus (Gemini + Claude)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d4af37]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div>
                      <p className="font-medium">Large Transaction Alert</p>
                      <p className="text-sm text-gray-500">Notify for transactions over 1000 LXG</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d4af37]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-4">
              <div className="card">
                <h3 className="font-semibold mb-4">Notification Preferences</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div>
                      <p className="font-medium">Transaction Notifications</p>
                      <p className="text-sm text-gray-500">Get notified for all transactions</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d4af37]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div>
                      <p className="font-medium">Price Alerts</p>
                      <p className="text-sm text-gray-500">Notify when LXG price changes significantly</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d4af37]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div>
                      <p className="font-medium">Game Updates</p>
                      <p className="text-sm text-gray-500">Notifications from connected games</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d4af37]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'wallet' && (
            <div className="space-y-4">
              <div className="card">
                <h3 className="font-semibold mb-4">Wallet Settings</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-[#0a0a0f] rounded-xl">
                    <p className="font-medium mb-2">Connected Wallet</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#b8941f] flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <p className="font-mono text-sm">{address}</p>
                        <p className="text-xs text-gray-500">MetaMask</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                    <p className="font-medium text-red-400 mb-2">Danger Zone</p>
                    <p className="text-sm text-gray-400 mb-4">
                      Disconnecting your wallet will require you to reconnect to access your funds.
                    </p>
                    <button
                      onClick={() => {
                        disconnectWallet();
                        toast.success('Wallet disconnected');
                      }}
                      className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'connections' && (
            <div className="space-y-4">
              <div className="card">
                <h3 className="font-semibold mb-4">Connected Services</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">✈️</span>
                      <div>
                        <p className="font-medium">Telegram</p>
                        <p className="text-sm text-gray-500">@Laxigam_blockchain_bot</p>
                      </div>
                    </div>
                    <span className="badge badge-success">Connected</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💎</span>
                      <div>
                        <p className="font-medium">TON Network</p>
                        <p className="text-sm text-gray-500">The Open Network</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toast.info('TON Connect coming soon!')}
                      className="px-4 py-2 bg-[#d4af37]/20 text-[#d4af37] rounded-lg hover:bg-[#d4af37]/30 transition-colors"
                    >
                      Connect
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🪙</span>
                      <div>
                        <p className="font-medium">BLUM</p>
                        <p className="text-sm text-gray-500">Alex Coin on Telegram</p>
                      </div>
                    </div>
                    <a
                      href="https://blum.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#d4af37]/20 text-[#d4af37] rounded-lg hover:bg-[#d4af37]/30 transition-colors"
                    >
                      View
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
