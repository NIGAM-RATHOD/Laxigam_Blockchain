import React, { useState } from 'react';
import {
  ArrowUpRight,
  Wallet,
  CreditCard,
  Building2,
  AlertCircle,
  Check,
  Copy
} from 'lucide-react';
import { useWalletStore, useExchangeStore } from '../store/walletStore';
import toast from 'react-hot-toast';

const withdrawalMethods = [
  {
    id: 'bank',
    name: 'Bank Transfer',
    description: 'Direct to your bank account',
    icon: Building2,
    processingTime: '1-3 business days',
    fee: '2%',
    minAmount: 100
  },
  {
    id: 'upi',
    name: 'UPI Withdrawal',
    description: 'India - Direct to UPI ID',
    icon: Wallet,
    processingTime: 'Instant - 24 hours',
    fee: '1%',
    minAmount: 50
  },
  {
    id: 'pix',
    name: 'PIX Withdrawal',
    description: 'Brazil - Direct to PIX key',
    icon: Wallet,
    processingTime: 'Instant - 24 hours',
    fee: '1%',
    minAmount: 50
  },
  {
    id: 'crypto',
    name: 'Crypto Withdrawal',
    description: 'Withdraw to external wallet',
    icon: CreditCard,
    processingTime: '10-30 minutes',
    fee: '0.5%',
    minAmount: 10
  }
];

function Withdraw() {
  const [step, setStep] = useState('method'); // method, amount, details, confirm, processing
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [withdrawalData, setWithdrawalData] = useState(null);
  
  const { realBalance } = useWalletStore();
  const { lxgUsdRate, convertLXGToFiat } = useExchangeStore();

  const fiatAmount = amount ? convertLXGToFiat(parseFloat(amount), 'USD') : 0;
  const fee = amount ? parseFloat(amount) * 0.02 : 0;
  const netAmount = amount ? parseFloat(amount) - fee : 0;

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setStep('amount');
  };

  const handleAmountSubmit = () => {
    const amountNum = parseFloat(amount);
    
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (amountNum > realBalance) {
      toast.error('Insufficient balance');
      return;
    }
    
    if (amountNum < selectedMethod.minAmount) {
      toast.error(`Minimum withdrawal is ${selectedMethod.minAmount} LXG`);
      return;
    }
    
    setStep('details');
  };

  const handleDetailsSubmit = () => {
    if (!destination) {
      toast.error('Please enter destination details');
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setStep('processing');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockData = {
      withdrawal_id: `WDR${Date.now()}`,
      amount: parseFloat(amount),
      fee,
      net_amount: netAmount,
      fiat_amount: fiatAmount,
      method: selectedMethod.id,
      destination,
      status: 'processing',
      estimated_time: selectedMethod.processingTime
    };
    
    setWithdrawalData(mockData);
    toast.success('Withdrawal request submitted!');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Withdraw LXG</h1>
        <p className="text-gray-400 mt-1">Convert your LXG to fiat or crypto</p>
      </div>

      {/* Balance */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Available for Withdrawal</p>
            <p className="text-2xl font-bold mt-1">{realBalance.toFixed(2)} LXG</p>
            <p className="text-sm text-gray-500">≈ ${(realBalance * lxgUsdRate).toFixed(2)} USD</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8941f] flex items-center justify-center">
            <Wallet className="w-6 h-6 text-black" />
          </div>
        </div>
      </div>

      {/* Step Content */}
      {step === 'method' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {withdrawalMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                onClick={() => handleMethodSelect(method)}
                className="payment-method-card text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#d4af37]/20 to-[#d4af37]/5 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-[#d4af37]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{method.name}</h3>
                    <p className="text-sm text-gray-500">{method.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-gray-400">
                        Fee: <span className="text-[#d4af37]">{method.fee}</span>
                      </span>
                      <span className="text-gray-400">
                        Min: <span className="text-white">{method.minAmount} LXG</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {method.processingTime}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {step === 'amount' && (
        <div className="card max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep('method')}
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </button>
            <div>
              <h3 className="font-semibold">{selectedMethod.name}</h3>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Amount (LXG)
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
                  LXG
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Available: {realBalance.toFixed(2)} LXG
              </p>
            </div>

            {amount && (
              <div className="p-4 bg-[#0a0a0f] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">You send</span>
                  <span className="font-medium">{parseFloat(amount).toFixed(2)} LXG</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Fee ({selectedMethod.fee})</span>
                  <span className="font-medium text-red-500">-{fee.toFixed(2)} LXG</span>
                </div>
                <div className="border-t border-gray-800 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">You receive</span>
                    <span className="text-xl font-bold text-green-500">
                      {netAmount.toFixed(2)} LXG
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-500 text-sm">Fiat Value</span>
                  <span className="text-sm text-gray-400">
                    ≈ ${(netAmount * lxgUsdRate).toFixed(2)} USD
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

      {step === 'details' && (
        <div className="card max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep('amount')}
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </button>
            <h3 className="font-semibold">Destination Details</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                {selectedMethod.id === 'bank' && 'Bank Account Number'}
                {selectedMethod.id === 'upi' && 'UPI ID'}
                {selectedMethod.id === 'pix' && 'PIX Key'}
                {selectedMethod.id === 'crypto' && 'Wallet Address'}
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={
                  selectedMethod.id === 'bank' ? 'Enter account number' :
                  selectedMethod.id === 'upi' ? 'name@upi' :
                  selectedMethod.id === 'pix' ? 'CPF, email, or phone' :
                  '0x...'
                }
                className="input"
              />
            </div>

            {selectedMethod.id === 'bank' && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="SBIN0001234"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    className="input"
                  />
                </div>
              </>
            )}

            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-400">
                Please double-check your details. Withdrawals to incorrect addresses cannot be recovered.
              </p>
            </div>

            <button
              onClick={handleDetailsSubmit}
              disabled={!destination}
              className="btn-primary w-full"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="card max-w-md mx-auto">
          <h3 className="font-semibold mb-4">Confirm Withdrawal</h3>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Method</span>
              <span className="font-medium">{selectedMethod.name}</span>
            </div>
            <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Amount</span>
              <span className="font-medium">{parseFloat(amount).toFixed(2)} LXG</span>
            </div>
            <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Fee</span>
              <span className="font-medium text-red-500">-{fee.toFixed(2)} LXG</span>
            </div>
            <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Net Amount</span>
              <span className="font-bold text-green-500">{netAmount.toFixed(2)} LXG</span>
            </div>
            <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Destination</span>
              <span className="font-mono text-sm">{destination.slice(0, 20)}...</span>
            </div>
            <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Processing Time</span>
              <span className="font-medium">{selectedMethod.processingTime}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('details')}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              className="btn-primary flex-1"
            >
              Confirm Withdrawal
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && withdrawalData && (
        <div className="card max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-500" />
          </div>

          <h3 className="text-xl font-semibold mb-2">Withdrawal Submitted!</h3>
          <p className="text-gray-400 mb-6">
            Your withdrawal is being processed
          </p>

          <div className="space-y-3 mb-6 text-left">
            <div className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Withdrawal ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{withdrawalData.withdrawal_id}</span>
                <button
                  onClick={() => copyToClipboard(withdrawalData.withdrawal_id)}
                  className="p-1 hover:bg-white/5 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Amount</span>
              <span className="font-medium">{withdrawalData.net_amount.toFixed(2)} LXG</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Status</span>
              <span className="badge badge-success">Processing</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg">
              <span className="text-gray-400">Estimated Time</span>
              <span className="text-[#d4af37]">{withdrawalData.estimated_time}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setStep('method');
              setAmount('');
              setDestination('');
              setSelectedMethod(null);
            }}
            className="btn-primary w-full"
          >
            Make Another Withdrawal
          </button>
        </div>
      )}
    </div>
  );
}

export default Withdraw;
