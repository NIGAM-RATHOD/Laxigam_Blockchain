import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, CheckCircle2, Clock, Cpu, Loader2, ShieldCheck, XCircle, Zap } from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import { haptic } from '../hooks/useTelegram';
import Flag from '../components/ui/Flag';

const API_BASE = import.meta.env.VITE_API_URL || '';

const PAYMENT_METHODS = {
  deposit: [
    { id: 'UPI', icon: '🇮🇳', label: 'UPI', currency: 'INR' },
    { id: 'PIX', icon: '🇧🇷', label: 'PIX', currency: 'BRL' },
    { id: 'QIWI', icon: '🇷🇺', label: 'QIWI', currency: 'RUB' },
    { id: 'ALIPAY', icon: '🇨🇳', label: 'Alipay', currency: 'CNY' },
    { id: 'STARS', icon: '⭐', label: 'Stars', currency: 'USD' },
    { id: 'TON', icon: '💎', label: 'TON', currency: 'USD' },
  ],
  withdraw: [
    { id: 'UPI', icon: '🇮🇳', label: 'UPI', currency: 'INR' },
    { id: 'PIX', icon: '🇧🇷', label: 'PIX', currency: 'BRL' },
    { id: 'QIWI', icon: '🇷🇺', label: 'QIWI', currency: 'RUB' },
    { id: 'ALIPAY', icon: '🇨🇳', label: 'Alipay', currency: 'CNY' },
  ],
};

const DESTINATION = {
  UPI: { label: 'UPI ID', placeholder: 'yourname@upi' },
  PIX: { label: 'PIX key', placeholder: 'CPF, phone or email' },
  QIWI: { label: 'QIWI phone', placeholder: '+79001234567' },
  ALIPAY: { label: 'Alipay account', placeholder: 'alipay@account.com' },
};

// Indicative rates; the backend quote is authoritative
const EXCHANGE_RATES = { INR: 83.0, BRL: 5.0, RUB: 92.0, CNY: 7.2, USD: 1.0 };
const LXG_USD_RATE = 0.05;
const FEES = { deposit: 0.005, withdraw: 0.01 };

export default function Mediator() {
  const { address, telegramChatId } = useWalletStore();
  const [mode, setMode] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [destination, setDestination] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const currency = PAYMENT_METHODS[mode].find((m) => m.id === paymentMethod)?.currency || 'USD';

  const quote = useMemo(() => {
    const value = parseFloat(amount);
    if (!value || value <= 0) return null;
    const rate = EXCHANGE_RATES[currency] || 1;

    if (mode === 'deposit') {
      const gross = value / rate / LXG_USD_RATE;
      const fee = gross * FEES.deposit;
      return { pay: `${value.toLocaleString()} ${currency}`, fee: `${fee.toFixed(4)} LXG`, receive: (gross - fee).toFixed(2), receiveUnit: 'LXG', rate: `1 ${currency} = ${(1 / rate / LXG_USD_RATE).toFixed(4)} LXG` };
    }
    const gross = value * LXG_USD_RATE * rate;
    const fee = gross * FEES.withdraw;
    return { pay: `${value.toLocaleString()} LXG`, fee: `${fee.toFixed(2)} ${currency}`, receive: (gross - fee).toFixed(2), receiveUnit: currency, rate: `1 LXG = ${(LXG_USD_RATE * rate).toFixed(2)} ${currency}` };
  }, [amount, currency, mode]);

  useEffect(() => {
    setStatus(null);
  }, [mode, paymentMethod]);

  const switchMode = (next) => {
    haptic();
    setMode(next);
    setPaymentMethod('UPI');
    setAmount('');
  };

  const handleSubmit = async () => {
    if (!quote) return;
    haptic('medium');
    setLoading(true);
    setStatus({ type: 'processing', message: 'Running AI validation and creating your order…' });

    try {
      const isDeposit = mode === 'deposit';
      const response = await fetch(`${API_BASE}/api/mediator/${isDeposit ? 'deposit' : 'withdraw'}/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isDeposit
            ? { wallet_address: address, payment_method: paymentMethod, amount_fiat: parseFloat(amount), currency, telegram_id: telegramChatId ? Number(telegramChatId) : null }
            : { wallet_address: address, amount_lxg: parseFloat(amount), payment_method: paymentMethod, destination, currency, telegram_id: telegramChatId ? Number(telegramChatId) : null }
        ),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || data.error || 'Request failed');

      setStatus({
        type: 'success',
        message: isDeposit
          ? 'Order created. Complete the payment using the instructions from your payment app.'
          : 'Withdrawal approved. Sign the transaction in your wallet to lock your LXG.',
      });
    } catch (err) {
      setStatus({ type: 'error', message: err.message === 'Failed to fetch' ? 'Cannot reach the Laxigam API. Is the backend running?' : err.message });
    } finally {
      setLoading(false);
    }
  };

  const needsDestination = mode === 'withdraw' && !destination.trim();

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="text-center">
        <p className="eyebrow">Mediator</p>
        <h1 className="text-3xl font-bold mt-1">
          {mode === 'deposit' ? 'Buy' : 'Sell'} <span className="gradient-text">LXG</span>
        </h1>
        <p className="text-gray-400 mt-2 text-sm">Convert between LXG and your local currency on BRICS+ payment rails.</p>
      </div>

      <div className="card !p-5 sm:!p-6">
        {/* Mode switch */}
        <div className="relative grid grid-cols-2 p-1 rounded-2xl surface-inset mb-6">
          <span
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl btn-primary !p-0 transition-transform duration-300"
            style={{ transform: mode === 'deposit' ? 'translateX(4px)' : 'translateX(calc(100% + 4px))', left: 0 }}
          />
          {['deposit', 'withdraw'].map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`relative z-10 py-2.5 text-sm font-semibold transition-colors ${mode === m ? 'text-[#1a1306]' : 'text-gray-400 hover:text-white'}`}
            >
              {m === 'deposit' ? 'Buy LXG' : 'Sell LXG'}
            </button>
          ))}
        </div>

        {/* Methods */}
        <p className="eyebrow mb-3">Payment rail</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
          {PAYMENT_METHODS[mode].map((method) => (
            <button
              key={method.id}
              onClick={() => {
                haptic();
                setPaymentMethod(method.id);
              }}
              className={`payment-method-card !p-3 flex-col !items-center gap-1 ${paymentMethod === method.id ? 'selected' : ''}`}
            >
              <Flag emoji={method.icon} size={22} />
              <span className="text-xs font-semibold">{method.label}</span>
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="surface-inset p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>{mode === 'deposit' ? 'You pay' : 'You sell'}</span>
            <span>{mode === 'deposit' ? PAYMENT_METHODS.deposit.find((m) => m.id === paymentMethod)?.label : 'from Real Wallet'}</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-3xl font-bold font-display outline-none placeholder:text-gray-700 tabular"
            />
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 font-semibold text-sm">{mode === 'deposit' ? currency : 'LXG'}</span>
          </div>
        </div>

        <div className="flex justify-center -my-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-[#12121c] border border-[#d4af37]/30 flex items-center justify-center shadow-lg">
            <ArrowDown className="w-4 h-4 text-[#f6e27a]" />
          </div>
        </div>

        <div className="surface-inset p-4 mb-5">
          <div className="text-xs text-gray-500 mb-2">You receive</div>
          <div className="flex items-center gap-3">
            <span className={`flex-1 text-3xl font-bold font-display tabular ${quote ? 'gradient-text' : 'text-gray-700'}`}>{quote ? Number(quote.receive).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</span>
            <span className="px-3 py-1.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 font-semibold text-sm text-[#f6e27a]">{mode === 'deposit' ? 'LXG' : currency}</span>
          </div>
        </div>

        {mode === 'withdraw' && (
          <div className="mb-5">
            <label className="eyebrow block mb-2">{DESTINATION[paymentMethod].label}</label>
            <input type="text" className="input" placeholder={DESTINATION[paymentMethod].placeholder} value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>
        )}

        {quote && (
          <div className="space-y-2 text-sm mb-5 px-1">
            <Row label="Rate" value={quote.rate} />
            <Row label={`Fee (${FEES[mode] * 100}%)`} value={quote.fee} />
            <Row label="Settlement" value={mode === 'deposit' ? '~30 seconds after payment' : 'Within 24 hours'} />
          </div>
        )}

        {status && <StatusBox status={status} />}

        <button onClick={handleSubmit} disabled={loading || !quote || needsDestination} className="btn-primary w-full !py-4 text-base">
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Processing…
            </>
          ) : !quote ? (
            'Enter an amount'
          ) : needsDestination ? (
            `Enter your ${DESTINATION[paymentMethod].label}`
          ) : mode === 'deposit' ? (
            `Buy ${Number(quote.receive).toLocaleString()} LXG`
          ) : (
            `Sell ${Number(amount).toLocaleString()} LXG`
          )}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Assurance icon={Cpu} title="Dual-AI" body="Gemini + Claude" />
        <Assurance icon={ShieldCheck} title="Vault-locked" body="MediatorVault" />
        <Assurance icon={Zap} title="Low fees" body="0.5% · 1%" />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-200 tabular">{value}</span>
    </div>
  );
}

function StatusBox({ status }) {
  const variants = {
    processing: { icon: Clock, cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300', title: 'Processing' },
    success: { icon: CheckCircle2, cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', title: 'Success' },
    error: { icon: XCircle, cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300', title: 'Something went wrong' },
  };
  const variant = variants[status.type];
  return (
    <div className={`flex gap-3 p-4 rounded-2xl border mb-5 animate-rise ${variant.cls}`}>
      <variant.icon className={`w-5 h-5 shrink-0 mt-0.5 ${status.type === 'processing' ? 'animate-pulse' : ''}`} />
      <div>
        <p className="font-semibold text-sm">{variant.title}</p>
        <p className="text-sm text-gray-300/80 mt-0.5">{status.message}</p>
      </div>
    </div>
  );
}

function Assurance({ icon: Icon, title, body }) {
  return (
    <div className="card !p-3">
      <Icon className="w-5 h-5 mx-auto text-[#d4af37]" />
      <p className="text-xs font-semibold mt-2">{title}</p>
      <p className="text-[11px] text-gray-500">{body}</p>
    </div>
  );
}
