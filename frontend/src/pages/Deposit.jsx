import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowDownLeft,
  Copy,
  Check,
  Wallet,
  CreditCard,
  Star,
  Diamond
} from 'lucide-react';
import { useWalletStore, useExchangeStore } from '../store/walletStore';
import toast from 'react-hot-toast';

const paymentMethods = [
  {
    id: 'upi',
    name: 'UPI',
    country: 'India',
    flag: '🇮🇳',
    description: 'Pay via Google Pay, PhonePe, Paytm',
    icon: Wallet,
    currencies: ['INR']
  },
  {
    id: 'pix',
    name: 'PIX',
    country: 'Brazil',
    flag: '🇧🇷',
    description: 'Instant bank transfer',
    icon: Wallet,
    currencies: ['BRL']
  },
  {
    id: 'qiwi',
    name: 'QIWI',
    country: 'Russia',
    flag: '🇷🇺',
    description: 'QIWI Wallet & Cards',
    icon: Wallet,
    currencies: ['RUB']
  },
  {
    id: 'alipay',
    name: 'Alipay',
    country: 'China',
    flag: '🇨🇳',
    description: '支付宝支付',
    icon: Wallet,
    currencies: ['CNY']
  },
  {
    id: 'card',
    name: 'Credit Card',
    country: 'Global',
    flag: '💳',
    description: 'Visa, Mastercard, Amex',
    icon: CreditCard,
    currencies: ['USD', 'EUR', 'GBP']
  },
  {
    id: 'stars',
    name: 'Telegram Stars',
    country: 'Global',
    flag: '⭐',
    description: 'Pay with Telegram Stars',
    icon: Star,
    currencies: ['STARS']
  },
  {
    id: 'ton',
    name: 'TON Network',
    country: 'Global',
    flag: '💎',
    description: 'Pay with TON tokens',
    icon: Diamond,
    currencies: ['TON']
  }
];

function Deposit() {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [step, setStep] = useState('select'); // select, amount, confirm, processing
  const [depositData, setDepositData] = useState(null);
  
  const { convertFiatToLXG } = useExchangeStore();

  const lxgAmount = amount ? convertFiatToLXG(parseFloat(amount), currency) : 0;

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setCurrency(method.currencies[0]);
    setStep('amount');
  };

  const handleAmountSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setStep('processing');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock deposit data
    const mockData = {
      payment_id: `DEP${Date.now()}`,
      amount: parseFloat(amount),
      currency,
      lxg_amount: lxgAmount,
      qr_code: `upi://pay?pa=laxigam@upi&pn=Laxigam&am=${amount}&cu=${currency}`,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    
    setDepositData(mockData);
    toast.success('Deposit initiated! Complete the payment to receive LXG.');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Deposit LXG</h1>
        <p className="text-gray-400 mt-1">Add funds to your wallet using BRICS+ payments</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {['Select Method', 'Amount', 'Confirm', 'Pay'].map((s, i) => {
          const steps = ['select', 'amount', 'confirm', 'processing'];
          const currentIndex = steps.indexOf(step);
          const isActive = i <= currentIndex;
          const isCurrent = i === currentIndex;
          
          return (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${isActive ? 'text-[#d4af37]' : 'text-gray-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isCurrent ? 'bg-[#d4af37] text-black' :
                  isActive ? 'bg-[#d4af37]/20 text-[#d4af37]' :
                  'bg-gray-800 text-gray-600'
                }`}>
                  {i + 1}
                </div>
                <span className="hidden sm:inline text-sm">{s}</span>
              </div>
              {i < 3 && (
                <div className={`w-8 h-0.5 ${isActive ? 'bg-[#d4af37]/30' : 'bg-gray-800'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      {step === 'select' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                onClick={() => handleMethodSelect(method)}
                className="payment-method-card text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#d4af37]/20 to-[#d4af37]/5 flex items-center justify-center">
                    <span className="text-2xl">{method.flag}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{method.name}</h3>
                    <p className="text-sm text-gray-500">{method.country}</p>
                    <p className="text-xs text-gray-600 mt-1">{method.description}</p>
                  </div>
                  <ArrowDownLeft className="w-5 h-5 text-gray-600" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {step === 'amount' && selectedMethod && (
        <div className="card max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep('select')}
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </button>
            <span className="text-2xl">{selectedMethod.flag}</span>
            <div>
              <h3 className="font-semibold">{selectedMethod.name}</h3>
              <p className="text-sm text-gray-500">{selectedMethod.country}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Amount ({selectedMethod.currencies[0]})
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="input text-2xl font-bold py-4"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  {selectedMethod.currencies[0]}
                </span>
              </div>
            </div>

            {amount && (
              <div className="p-4 bg-[#0a0a0f] rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">You will receive</span>
                  <span className="text-xl font-bold text-[#d4af37]">
                    {lxgAmount.toFixed(2)} LXG
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-500 text-sm">Exchange Rate</span>
                  <span className="text-sm text-gray-400">
                    1 LXG ≈ $0.05
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleAmountSubmit}
              disabled={!amount || parseFloat(amount) <= 0}
              className="btn-primary w-full"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="card max-w-md mx-auto">
          <h3 className="font-semibold mb-4">Confirm Deposit</h3>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Payment Method</span>
              <span className="font-medium">{selectedMethod?.name}</span>
            </div>
            <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Amount</span>
              <span className="font-medium">{amount} {currency}</span>
            </div>
            <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">You Receive</span>
              <span className="font-bold text-[#d4af37]">{lxgAmount.toFixed(2)} LXG</span>
            </div>
            <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Network Fee</span>
              <span className="font-medium text-green-500">Free</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('amount')}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              className="btn-primary flex-1"
            >
              Confirm Deposit
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && depositData && (
        <div className="card max-w-md mx-auto text-center">
          <div className="mb-6">
            <div className="w-48 h-48 mx-auto bg-white p-4 rounded-xl">
              <QRCodeSVG
                value={depositData.qr_code}
                size={160}
                level="M"
              />
            </div>
          </div>

          <h3 className="font-semibold mb-2">Complete Your Payment</h3>
          <p className="text-gray-400 text-sm mb-6">
            Scan the QR code with your {selectedMethod?.name} app to complete the payment
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Payment ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{depositData.payment_id}</span>
                <button
                  onClick={() => copyToClipboard(depositData.payment_id)}
                  className="p-1 hover:bg-white/5 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Amount</span>
              <span className="font-medium">{depositData.amount} {depositData.currency}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Expires</span>
              <span className="text-sm text-yellow-500">30 minutes</span>
            </div>
          </div>

          <div className="p-4 bg-[#d4af37]/10 rounded-xl border border-[#d4af37]/20">
            <p className="text-sm text-[#d4af37]">
              Your LXG will be credited automatically once payment is confirmed
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Deposit;
